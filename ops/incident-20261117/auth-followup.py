#!/usr/bin/env python3
"""Bounded, read-only authentication/persistence facts; emit JSON Lines only.

Uses no subprocesses or network. Never emits raw log lines, command arguments,
public-key comments, private keys, passwords, or environment values. File reads
use O_NOFOLLOW and accept regular files only. Run with Python 3 on the host.
"""

import base64
import binascii
import collections
import datetime as dt
import errno
import gzip
import hashlib
import ipaddress
import json
import os
import pwd
import re
import signal
import stat
import time


MIB = 1024 * 1024
PER_FILE_LIMIT = 64 * MIB
TOTAL_LOG_LIMIT = 160 * MIB
RUN_SECONDS = 120
LINE_LIMIT = 64 * 1024
EVENT_LIMIT = 2000
ACCOUNT_EVENT_LIMIT = 500
METADATA_FILE_LIMIT = MIB
METADATA_TOTAL_LIMIT = 8 * MIB
METADATA_COUNT_LIMIT = 256
KNOWN_CI = "SHA256:BboNPYmZDiwK8QF4af8iogJi/PLFsOEvdWUrjm4TG38"
DIRECT_ATTEMPT_PREFIX = "SHA256:ZzDB"
START = time.monotonic()
DEADLINE = START + RUN_SECONDS
UTC = dt.timezone.utc
log_bytes = 0
metadata_bytes = 0
metadata_files = 0
accepted_count = 0
account_count = 0
accepted_omitted = 0
account_omitted = 0
failure_ips = collections.Counter()
failure_dates = collections.defaultdict(collections.Counter)
failure_kinds = collections.Counter()
sudo_sessions = collections.Counter()
key_facts = {}
limits = collections.Counter()
current_operation = "initialization"


class CollectionDeadline(Exception):
    pass


def deadline_alarm(signum, frame):
    raise CollectionDeadline()


def emit(kind, **values):
    print(json.dumps(dict(kind=kind, **values), ensure_ascii=True, sort_keys=True), flush=True)


def remaining():
    return time.monotonic() < DEADLINE


def safe_word(value, maximum=100):
    if value and len(value) <= maximum and re.fullmatch(r"[A-Za-z0-9_.@/+:-]+", value):
        return value
    return "[redacted_or_nonstandard]" if value else None


def source_ip(value):
    try:
        return str(ipaddress.ip_address(value.strip("[]")))
    except (ValueError, AttributeError):
        return "[unparsed_source]"


def error_fact(exc):
    return {"error": type(exc).__name__, "errno": getattr(exc, "errno", None)}


def open_regular(path):
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    fd = os.open(path, flags)
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode):
            raise OSError(errno.EINVAL, "not_regular")
        return os.fdopen(fd, "rb"), st
    except BaseException:
        os.close(fd)
        raise


def iso(stamp):
    return stamp.astimezone(UTC).isoformat().replace("+00:00", "Z") if stamp else None


def timestamp(line, reference):
    # RFC3164 has no year/offset: infer nearest year to file mtime, in host TZ.
    match = re.match(r"^([A-Z][a-z]{2}\s+\d{1,2}\s+\d\d:\d\d:\d\d)\s+", line)
    if match:
        try:
            part = dt.datetime.strptime(match.group(1), "%b %d %H:%M:%S")
            options = [part.replace(year=y).astimezone() for y in
                       (reference.year - 1, reference.year, reference.year + 1)]
            return min(options, key=lambda value: abs((value - reference).total_seconds()))
        except ValueError:
            return None
    match = re.match(r"^(\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?)", line)
    if match:
        try:
            return dt.datetime.fromisoformat(match.group(1).replace("Z", "+00:00")).astimezone()
        except ValueError:
            pass
    return None


def key_fact(method, user, address, fingerprint, when, outcome):
    if not fingerprint:
        return
    identity = (fingerprint, method, user, address, outcome)
    if identity not in key_facts and len(key_facts) >= 500:
        limits["key_fact_identity_limit"] += 1
        return
    fact = key_facts.setdefault(identity, {"count": 0, "first": when, "last": when})
    fact["count"] += 1
    if when:
        fact["first"] = min(filter(None, (fact["first"], when)))
        fact["last"] = max(filter(None, (fact["last"], when)))


def parse_auth(line, path, number, stamp):
    global accepted_count, accepted_omitted, account_count, account_omitted
    when = iso(stamp)
    day = when[:10] if when else "unknown_timestamp"
    # Sudo command records are deliberately neither copied nor parsed as commands.
    if re.search(r"\bsudo(?:\[\d+\])?:", line):
        match = re.search(r"pam_unix\(sudo:session\): session (opened|closed) for user ([^\s(]+)", line)
        if match:
            sudo_sessions[(day, match.group(1), safe_word(match.group(2)))] += 1
    match = re.search(r"\bAccepted (\S+) for (\S+) from (\S+) port \d+", line)
    fingerprint_match = re.search(r"\b(SHA256:[A-Za-z0-9+/=]{12,100}|MD5:(?:[a-fA-F0-9]{2}:){15}[a-fA-F0-9]{2})", line)
    fingerprint = fingerprint_match.group(1) if fingerprint_match else None
    if match:
        method, user, address = safe_word(match.group(1)), safe_word(match.group(2)), source_ip(match.group(3))
        accepted_count += 1
        key_fact(method, user, address, fingerprint, when, "accepted")
        if accepted_count <= EVENT_LIMIT:
            emit("accepted_authentication", file=path, line=number, time_utc=when,
                 authmethod=method, user=user, source_ip=address, fingerprint=fingerprint,
                 matches_known_ci_fingerprint=(fingerprint == KNOWN_CI),
                 matches_direct_attempt_prefix=bool(fingerprint and fingerprint.startswith(DIRECT_ATTEMPT_PREFIX)))
        else:
            accepted_omitted += 1
    failure = re.search(r"\bFailed (\S+) for (?:invalid user )?(\S+) from (\S+) port \d+", line)
    invalid = re.search(r"\bInvalid user (\S+) from (\S+) port \d+", line)
    pam = re.search(r"authentication failure;.*?\brhost=([^\s;]+)", line)
    category = address = None
    if failure:
        category, address = "failed_authentication", source_ip(failure.group(3))
        key_fact(safe_word(failure.group(1)), safe_word(failure.group(2)), address, fingerprint, when, "failed")
    elif invalid:
        category, address = "invalid_user", source_ip(invalid.group(2))
    elif pam and "sshd" in line:
        category, address = "pam_authentication_failure", source_ip(pam.group(1))
    if category:
        failure_kinds[category] += 1
        if address in failure_ips or len(failure_ips) < 50000:
            failure_ips[address] += 1
            if day in failure_dates or len(failure_dates) < 128:
                failure_dates[day][address] += 1
            else:
                limits["failure_date_limit"] += 1
        else:
            limits["unique_failure_ip_limit"] += 1
    service = re.search(r"\b(useradd|usermod|userdel|groupadd|groupmod|groupdel|passwd|chpasswd|chage|gpasswd|adduser)(?:\[\d+\])?:", line)
    keys_reference = "authorized_keys" in line.lower() and "sshd" in line
    if service or keys_reference:
        account_count += 1
        if account_count <= ACCOUNT_EVENT_LIMIT:
            # A reference is not a verified authorized_keys modification.
            event = "authorized_keys_reference" if keys_reference else "account_management_record"
            principal = re.search(r"(?:\bname=|\buser=|\bfor user ['\"]?|\bpassword changed for )([A-Za-z0-9_.@-]{1,100})(?=[,'\"\s]|$)", line)
            emit("account_event_candidate", file=path, line=number, time_utc=when,
                 service=service.group(1) if service else "sshd", event=event,
                 target_user=principal.group(1) if principal else None,
                 arguments_redacted=True, change_verified=False)
        else:
            account_omitted += 1


def scan_log(path):
    global log_bytes, current_operation
    current_operation = "auth_log:" + path
    result = dict(file=path, bytes_read=0, lines=0, parsed_timestamps=0,
                  oversized_lines_skipped=0, earliest_utc=None, latest_utc=None,
                  status="complete", complete=False)
    first = last = None
    raw = stream = None
    try:
        raw, st = open_regular(path)
        result.update(disk_bytes=st.st_size, mtime_utc=iso(dt.datetime.fromtimestamp(st.st_mtime, UTC)))
        reference = dt.datetime.fromtimestamp(st.st_mtime).astimezone()
        stream = gzip.GzipFile(fileobj=raw, mode="rb") if path.endswith(".gz") else raw
        oversized = False
        while True:
            if not remaining():
                result["status"] = "time_limit"
                break
            allowance = min(PER_FILE_LIMIT - result["bytes_read"], TOTAL_LOG_LIMIT - log_bytes)
            if allowance <= 0:
                result["status"] = "per_file_byte_limit" if result["bytes_read"] >= PER_FILE_LIMIT else "total_byte_limit"
                break
            chunk = stream.readline(min(LINE_LIMIT, allowance))
            if not chunk:
                if oversized:
                    result["lines"] += 1
                    result["oversized_lines_skipped"] += 1
                result["complete"] = True
                break
            result["bytes_read"] += len(chunk)
            log_bytes += len(chunk)
            if oversized or (len(chunk) == LINE_LIMIT and not chunk.endswith(b"\n")):
                oversized = not chunk.endswith(b"\n")
                if not oversized:
                    result["lines"] += 1
                    result["oversized_lines_skipped"] += 1
                continue
            result["lines"] += 1
            line = chunk.decode("utf-8", errors="replace")
            stamp = timestamp(line, reference)
            if stamp:
                result["parsed_timestamps"] += 1
                first = min(first, stamp) if first else stamp
                last = max(last, stamp) if last else stamp
            parse_auth(line, path, result["lines"], stamp)
    except CollectionDeadline:
        result["status"] = "time_limit"
    except (OSError, EOFError, ValueError) as exc:
        result.update(status="read_error", **error_fact(exc))
    finally:
        if stream is not None and stream is not raw:
            stream.close()
        if raw is not None:
            raw.close()
    result.update(earliest_utc=iso(first), latest_utc=iso(last))
    emit("auth_file_coverage", **result)


SHELL_TOKENS = ("curl", "wget", "fetch", "nohup", "setsid", "disown", "crontab",
                "systemctl", "base64", "nc", "ncat", "netcat", "socat")
SHELL_ASSIGNMENTS = ("LD_PRELOAD", "LD_LIBRARY_PATH", "BASH_ENV", "ENV", "PROMPT_COMMAND")
UNIT_KEYS = {"execstart", "execstartpre", "execstartpost", "execstop", "execreload",
             "environment", "environmentfile", "workingdirectory", "user", "group",
             "restart", "onbootsec", "onunitactivesec", "oncalendar", "unit",
             "pathmodified", "pathchanged", "listenstream", "wantedby", "requiredby"}
SSH_KEYS = {"match", "include", "authorizedkeyscommand", "authorizedkeyscommanduser",
            "authorizedkeysfile", "authenticationmethods", "forcecommand", "permituserenvironment",
            "permitrootlogin", "passwordauthentication", "pubkeyauthentication", "allowusers",
            "allowgroups", "denyusers", "denygroups", "trustedusercakeys", "authorizedprincipalsfile",
            "authorizedprincipalscommand", "proxycommand", "localcommand", "remotecommand",
            "permitlocalcommand"}
SAFE_SSH_VALUES = {"yes", "no", "prohibit-password", "forced-commands-only", "any", "all", "none"}


def content_candidates(path, data, flavor):
    count = 0
    for number, line in enumerate(data.decode("utf-8", errors="replace").splitlines(), 1):
        if not remaining():
            limits["candidate_time_limit"] += 1
            break
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if flavor == "authorized_keys":
            match = re.search(r"(?:^|\s)(ssh-ed25519|ssh-rsa|ecdsa-sha2-[A-Za-z0-9-]+|sk-[A-Za-z0-9@.-]+)\s+([A-Za-z0-9+/=]+)(?:\s|$)", stripped)
            if match:
                try:
                    blob = base64.b64decode(match.group(2), validate=True)
                    fp = "SHA256:" + base64.b64encode(hashlib.sha256(blob).digest()).decode("ascii").rstrip("=")
                    option_prefix = stripped[:match.start(1)].strip()
                    options = [key for key in ("command", "from", "restrict", "no-pty", "permitopen", "environment", "cert-authority")
                               if re.search(r"(?:^|,)\s*" + re.escape(key) + r"(?:=|,|$)", option_prefix)]
                    emit("authorized_key_fact", file=path, line=number, algorithm=match.group(1),
                         fingerprint=fp, option_names=options, arguments_redacted=True,
                         matches_known_ci_fingerprint=(fp == KNOWN_CI))
                except (ValueError, binascii.Error):
                    emit("authorized_key_parse_error", file=path, line=number)
            else:
                emit("authorized_key_unparsed_line", file=path, line=number, contents_redacted=True)
            count += 1
        else:
            tokens = [token for token in SHELL_TOKENS if re.search(r"(?<![A-Za-z0-9_])" + token + r"(?![A-Za-z0-9_])", stripped)]
            assignments = [token for token in SHELL_ASSIGNMENTS if re.search(r"\b" + token + r"\s*=", stripped)]
            directive = None
            safe_value = None
            match = re.match(r"([A-Za-z][A-Za-z0-9]*)\s*(?:=|\s)\s*(.*)", stripped)
            if match:
                name, value = match.group(1).lower(), match.group(2).strip()
                if (flavor == "unit" and name in UNIT_KEYS) or (flavor == "ssh" and name in SSH_KEYS):
                    directive = name
                    if flavor == "ssh" and value.lower() in SAFE_SSH_VALUES:
                        safe_value = value.lower()
            reboot = bool(re.match(r"@reboot\b", stripped))
            encoded_or_eval = bool(re.search(r"\b(?:eval|exec)\b|/dev/(?:tcp|udp)/|urllib|urlopen|requests\.", stripped))
            if directive or tokens or assignments or reboot or encoded_or_eval:
                emit("persistence_directive_candidate", file=path, line=number, directive=directive,
                     safe_enumerated_value=safe_value, token_names=tokens, assignment_names=assignments,
                     at_reboot=reboot, execution_or_network_expression=encoded_or_eval,
                     arguments_redacted=True, maliciousness_verified=False)
                count += 1
        if count >= 100:
            emit("content_candidate_limit", file=path, maximum=100)
            break


def inspect_file(path, flavor="metadata"):
    global metadata_bytes, metadata_files, current_operation
    current_operation = "metadata:" + path
    if not remaining() or metadata_files >= METADATA_COUNT_LIMIT or metadata_bytes >= METADATA_TOTAL_LIMIT:
        limits["metadata_budget_limit"] += 1
        emit("file_metadata", file=path, status="budget_or_time_limit")
        return
    metadata_files += 1
    result = dict(file=path, status="complete")
    try:
        st = os.lstat(path)
        result.update(mode=stat.filemode(st.st_mode), uid=st.st_uid, gid=st.st_gid, bytes=st.st_size,
                      mtime_utc=iso(dt.datetime.fromtimestamp(st.st_mtime, UTC)),
                      ctime_utc=iso(dt.datetime.fromtimestamp(st.st_ctime, UTC)))
        if not stat.S_ISREG(st.st_mode):
            result.update(status="not_regular_no_follow", hash_complete=False)
            emit("file_metadata", **result)
            return
        stream, opened = open_regular(path)
        with stream:
            limit = min(METADATA_FILE_LIMIT, METADATA_TOTAL_LIMIT - metadata_bytes)
            data = stream.read(limit)
        metadata_bytes += len(data)
        result.update(sha256=hashlib.sha256(data).hexdigest(), hashed_bytes=len(data),
                      hash_complete=(len(data) == opened.st_size),
                      changed_during_open=(st.st_ino != opened.st_ino or st.st_dev != opened.st_dev))
        if len(data) < opened.st_size:
            result["status"] = "content_byte_limit"
        emit("file_metadata", **result)
        if flavor != "metadata":
            content_candidates(path, data, flavor)
    except OSError as exc:
        result.update(status="unavailable", **error_fact(exc))
        emit("file_metadata", **result)


def inspect_tree(path, flavor="unit", depth=0):
    global current_operation
    current_operation = "directory:" + path
    if not remaining() or metadata_files >= METADATA_COUNT_LIMIT:
        emit("directory_coverage", directory=path, status="budget_or_time_limit")
        return
    try:
        # Do not follow a directory symlink, including the starting root.
        if stat.S_ISLNK(os.lstat(path).st_mode):
            emit("directory_coverage", directory=path, status="symlink_not_followed")
            return
        with os.scandir(path) as iterator:
            entries = []
            for entry in iterator:
                entries.append(entry)
                if len(entries) >= 128:
                    emit("directory_entry_limit", directory=path, maximum=128)
                    break
        emit("directory_coverage", directory=path, status="enumerated", entries=len(entries), depth=depth)
        for entry in sorted(entries, key=lambda item: item.name):
            if not remaining():
                limits["directory_time_limit"] += 1
                break
            if entry.is_dir(follow_symlinks=False):
                if depth < 3:
                    inspect_tree(entry.path, flavor, depth + 1)
                else:
                    emit("directory_coverage", directory=entry.path, status="depth_limit")
            else:
                inspect_file(entry.path, flavor)
    except OSError as exc:
        emit("directory_coverage", directory=path, status="unavailable", **error_fact(exc))


def inspect_persistence():
    accounts = [entry for entry in pwd.getpwall() if entry.pw_uid == 0 or
                entry.pw_uid == os.getuid() or 1000 <= entry.pw_uid < 65534]
    seen = set()
    for entry in sorted(accounts, key=lambda value: value.pw_uid)[:8]:
        home = entry.pw_dir
        if home in seen or not home.startswith("/"):
            continue
        seen.add(home)
        emit("home_scope", user=safe_word(entry.pw_name), uid=entry.pw_uid, home=home)
        for relative, flavor in ((".bashrc", "shell"), (".profile", "shell"),
                                 (".bash_profile", "shell"), (".ssh/authorized_keys", "authorized_keys"),
                                 (".ssh/config", "ssh")):
            inspect_file(os.path.join(home, relative), flavor)
        for relative in (".config/systemd/user", ".local/share/systemd/user"):
            inspect_tree(os.path.join(home, relative))
        inspect_tree(os.path.join(home, ".config/autostart"), "unit")
    if len(accounts) > 8:
        emit("home_scope_limit", accounts_omitted=len(accounts) - 8)
    inspect_file("/etc/ssh/sshd_config", "ssh")
    inspect_tree("/etc/ssh/sshd_config.d", "ssh")
    for path in ("/etc/passwd", "/etc/group", "/etc/sudoers", "/etc/ld.so.preload"):
        inspect_file(path)
    inspect_tree("/etc/sudoers.d", "metadata")
    inspect_file("/etc/rc.local", "shell")
    inspect_file("/etc/crontab", "shell")
    inspect_tree("/etc/cron.d", "shell")
    inspect_tree("/var/spool/cron/crontabs", "shell")


def main():
    emit("collection_scope", started_utc=iso(dt.datetime.now(UTC)), uid=os.getuid(),
         time_limit_seconds=RUN_SECONDS, per_log_uncompressed_byte_limit=PER_FILE_LIMIT,
         total_log_uncompressed_byte_limit=TOTAL_LOG_LIMIT,
         metadata_total_byte_limit=METADATA_TOTAL_LIMIT, metadata_file_byte_limit=METADATA_FILE_LIMIT,
         timestamp_basis="RFC3164 year inferred nearest file mtime using host local timezone; ISO timestamps honored",
         host_timezone_names=list(time.tzname), known_ci_fingerprint=KNOWN_CI,
         direct_attempt_fingerprint_prefix=DIRECT_ATTEMPT_PREFIX,
         direct_attempt_prefix_is_not_full_fingerprint=True,
         failure_count_basis="log records by category, not distinct attempts; PAM/Failed/Invalid may overlap",
         effective_sshd_policy_evaluated=False, file_contents_and_command_arguments_emitted=False)
    for suffix in ("", ".1", ".2.gz", ".3.gz", ".4.gz"):
        path = "/var/log/auth.log" + suffix
        if not remaining() or log_bytes >= TOTAL_LOG_LIMIT:
            emit("auth_file_coverage", file=path, status="total_budget_or_time_limit", complete=False)
        else:
            scan_log(path)
    emit("failure_ip_top20", counts=[dict(source_ip=address, records=count) for address, count in failure_ips.most_common(20)],
         category_totals=dict(failure_kinds))
    for day in sorted(failure_dates):
        emit("failure_ip_daily_top20", date_utc=day,
             counts=[dict(source_ip=address, records=count) for address, count in failure_dates[day].most_common(20)])
    for (day, outcome, user), count in sorted(sudo_sessions.items()):
        emit("sudo_session_statistics", date_utc=day, outcome=outcome, target_user=user, records=count)
    for identity, values in sorted(key_facts.items()):
        fingerprint, method, user, address, outcome = identity
        emit("authentication_key_facts", fingerprint=fingerprint, authmethod=method, user=user,
             source_ip=address, outcome=outcome, matches_known_ci_fingerprint=(fingerprint == KNOWN_CI),
             matches_direct_attempt_prefix=fingerprint.startswith(DIRECT_ATTEMPT_PREFIX), **values)
    inspect_persistence()
    emit("collection_summary", elapsed_seconds=round(time.monotonic() - START, 3),
         time_limit_reached=not remaining(), log_uncompressed_bytes_read=log_bytes,
         metadata_bytes_read=metadata_bytes, metadata_files_considered=metadata_files,
         accepted_records=accepted_count, accepted_records_omitted=accepted_omitted,
         account_candidates=account_count, account_candidates_omitted=account_omitted,
         known_ci_accepted_key_records=sum(value["count"] for identity, value in key_facts.items()
                                          if identity[0] == KNOWN_CI and identity[4] == "accepted"),
         direct_attempt_prefix_failed_key_records=sum(value["count"] for identity, value in key_facts.items()
                                                      if identity[0].startswith(DIRECT_ATTEMPT_PREFIX) and identity[4] == "failed"),
         limits=dict(limits), conclusion="Bounded facts only; missing output or unchanged metadata does not establish a clean host.")


if __name__ == "__main__":
    signal.signal(signal.SIGALRM, deadline_alarm)
    signal.setitimer(signal.ITIMER_REAL, RUN_SECONDS)
    try:
        main()
    except CollectionDeadline:
        emit("collection_interrupted", status="time_limit", operation=current_operation,
             elapsed_seconds=round(time.monotonic() - START, 3),
             log_uncompressed_bytes_read=log_bytes, metadata_bytes_read=metadata_bytes,
             accepted_records=accepted_count, account_candidates=account_count,
             coverage_incomplete=True)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
