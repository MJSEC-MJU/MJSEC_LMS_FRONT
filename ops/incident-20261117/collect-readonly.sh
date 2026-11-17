#!/usr/bin/env bash
# Read-only, fail-soft incident evidence for an authorized mjsec.kr operator.
# Run before and after containment. No installation, service changes, Java starts,
# container exec, environment dumps, or secret/key-file contents are performed.
# Send stdout/stderr ONLY to the operator's encrypted evidence channel. Logs can
# contain sensitive data despite the conservative redactor below.
# Host access can update access times; sudo/journal access can itself be logged.
# Missing/limited evidence is reported and must never be interpreted as clean.

set -u
set -o pipefail
# Keep errors in the same stream that the caller encrypts; never spill evidence
# to a separate, potentially unencrypted CI stderr artifact.
exec 2>&1
export LC_ALL=C TZ=UTC
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly DEADLINE_SECONDS=540 MAX_CONTAINERS=24 MAX_PROCESSES=3000
readonly MAX_LINE_BYTES=2048
START_SECONDS=$SECONDS
ROOT=()
PRIVILEGE='current user only'
if (( EUID == 0 )); then
  PRIVILEGE='already root'
elif command -v sudo >/dev/null 2>&1 && command -v timeout >/dev/null 2>&1 &&
     timeout -k 1s 3s sudo -n -- true >/dev/null 2>&1; then
  ROOT=(sudo -n --)
  PRIVILEGE='noninteractive sudo available for read commands'
fi

section() {
  printf '\n===== BEGIN %s | UTC %s =====\n' "$1" "$(date -u +%FT%TZ)"
  shift
  "$@"
  local rc=$?
  printf '===== END section | function_status=%s =====\n' "$rc"
  return 0
}

# Consume all output until the command timeout, without SIGPIPE hiding its exit
# status. Bound both the number of emitted lines and the size of each line.
# Log redaction is best effort, not a guarantee that excerpts are safe to share.
limit_output() {
  awk -v cap="$1" -v logmode="$2" -v width="$MAX_LINE_BYTES" '
    {
      total++
      if (total > cap) next
      gsub(/[\001-\010\013\014\016-\037\177]/, "[CONTROL]")
      if (logmode == 1) {
        low=tolower($0)
        if (keyblock) {
          if (low ~ /-----end .*private key-----/) keyblock=0
          print "[REDACTED: private key block]"
          next
        }
        if (low ~ /-----begin .*private key-----/) {
          keyblock=1
          print "[REDACTED: private key block]"
          next
        }
        if (low ~ /(authorization|proxy-authorization|set-cookie|cookie)[[:space:]"\047]*[:=]/ ||
            low ~ /(password|passwd|access_token|refresh_token|client_secret|private_key|api_key|token|secret)[[:space:]"\047]*[:=]/ ||
            low ~ /[a-z][a-z0-9+.-]*:\/\/[^ /@]+:[^ /@]+@/) {
          print "[REDACTED: log line with credential/header/key material]"
          next
        }
        sub(/ action=exec_create:.*/, " action=exec_create [COMMAND ARGUMENTS OMITTED]")
        sub(/ action=exec_start:.*/, " action=exec_start [COMMAND ARGUMENTS OMITTED]")
        gsub(/\?[^[:space:]"<>]*/, "?[REDACTED_QUERY]")
        gsub(/[Bb][Ee][Aa][Rr][Ee][Rr][[:space:]]+[^[:space:]",;]+/, "Bearer [REDACTED]")
        gsub(/[Bb][Aa][Ss][Ii][Cc][[:space:]]+[A-Za-z0-9+\/=]+/, "Basic [REDACTED]")
      }
      if (length($0) > width) print substr($0, 1, width) " [LINE TRUNCATED]"
      else print
    }
    END { if (total > cap) print "[OUTPUT LIMITED: " total-cap " additional lines omitted]" }
  '
}

run_mode() {
  local seconds=$1 lines=$2 mode=$3 rc
  shift 3
  if (( SECONDS - START_SECONDS >= DEADLINE_SECONDS )); then
    printf '[SKIPPED: collector time budget reached]\n'
    return 0
  fi
  if ! command -v timeout >/dev/null 2>&1; then
    printf '[SKIPPED: GNU timeout unavailable; refusing unbounded command]\n'
    return 0
  fi
  timeout --signal=TERM --kill-after=2s "${seconds}s" "$@" 2>&1 |
    limit_output "$lines" "$mode"
  rc=${PIPESTATUS[0]}
  printf '[command_exit=%s; timeout normally 124, forced kill normally 137]\n' "$rc"
  return 0
}
run() { run_mode "$1" "$2" 0 "${@:3}"; }
run_root() { run_mode "$1" "$2" 0 "${ROOT[@]}" "${@:3}"; }
run_log_root() { run_mode "$1" "$2" 1 "${ROOT[@]}" "${@:3}"; }
quick_root() {
  (( SECONDS - START_SECONDS < DEADLINE_SECONDS )) || return 125
  timeout --signal=TERM --kill-after=1s 4s "${ROOT[@]}" "$@"
}
enumerate_root() {
  local seconds=$1 rc
  shift
  if (( SECONDS - START_SECONDS >= DEADLINE_SECONDS )); then
    printf '[Enumeration skipped: collector time budget reached]\n' >&2
    return
  fi
  timeout --signal=TERM --kill-after=1s "${seconds}s" "${ROOT[@]}" "$@" \
    2> >(limit_output 20 0 >&2)
  rc=$?
  printf '[enumeration_exit=%s; timeout normally 124]\n' "$rc" >&2
}

intro() {
  printf 'Collector purpose: bounded point-in-time evidence, before/after containment\n'
  printf 'Privilege: %s\n' "$PRIVILEGE"
  printf 'Limits: %ss scheduling budget; %s containers; %s process candidates\n' \
    "$DEADLINE_SECONDS" "$MAX_CONTAINERS" "$MAX_PROCESSES"
  printf 'No process arguments or environment contents. No Java process is started.\n'
  printf 'Log excerpts are bounded and conservatively redacted; retain encryption.\n'
  printf 'No conclusion of absence/cleanliness is implied by any missing result.\n'
  run 3 5 date -u --iso-8601=ns
  run 3 5 id
  run 3 5 uname -a
  run 3 5 uptime -s
  run 3 5 cat /proc/sys/kernel/random/boot_id /proc/uptime
  run 3 30 cat /etc/os-release
  run_root 4 10 timedatectl show -p Timezone -p NTPSynchronized -p TimeUSec
}

process_network() {
  printf 'Process ancestry columns have executable names only, no arguments.\n'
  run_root 8 1500 ps -eo pid,ppid,sid,pgid,user,etimes,lstart,stat,comm --sort=pid
  printf '\nListening TCP/UDP sockets:\n'
  run_root 8 450 ss -H -lntup
  printf '\nTCP/UDP connections (point in time):\n'
  run_root 10 850 ss -H -antup
  run_root 5 100 ip -brief address
  run_root 5 100 ip route show table main
  run_root 5 120 ip neigh show
  run_root 5 120 who -a
  run_root 5 120 loginctl list-sessions --no-pager
}

# Metadata and SHA-256 only. Per metadata section hash at most 32 MiB in total,
# with an 8 MiB per-file limit. Secret files are never printed.
HASH_REMAIN=33554432
HASH_COUNT=0
metadata_path() {
  local path=$1 size
  printf '\npath=%q\n' "$path"
  run_root 4 3 stat -c 'mode=%A uid=%u gid=%g size=%s inode=%i links=%h mtime=%y ctime=%z birth=%w name=%n' -- "$path"
  if ! quick_root test -f "$path" || quick_root test -L "$path"; then
    printf '[hash skipped: not a regular non-symlink file]\n'
    return
  fi
  size=$(quick_root stat -c %s -- "$path" 2>/dev/null) || {
    printf '[hash skipped: stat inaccessible or timed out]\n'; return;
  }
  if [[ ! $size =~ ^[0-9]+$ ]] || (( size > 8388608 || size > HASH_REMAIN || HASH_COUNT >= 80 )); then
    printf '[hash skipped: size or per-section hash budget]\n'
    return
  fi
  HASH_REMAIN=$((HASH_REMAIN-size)); HASH_COUNT=$((HASH_COUNT+1))
  run_root 4 3 sha256sum -- "$path"
}

runtime_processes() {
  local pid comm exe clean home release seen_count=0 selected=0 inaccessible=0 size
  local section_deadline=$((SECONDS+90))
  local -A hashed=()
  local binary_budget=268435456
  printf 'Selection: Java; deleted/memfd executable; executable in tmp, shm, or uploads;\n'
  printf 'or known suspicious executable names. This is heuristic and not exhaustive.\n'
  while read -r pid comm; do
    [[ $pid =~ ^[0-9]+$ ]] || continue
    seen_count=$((seen_count+1))
    (( seen_count > MAX_PROCESSES )) && { printf '[Process candidate limit reached]\n'; break; }
    (( SECONDS - START_SECONDS >= DEADLINE_SECONDS )) && break
    (( SECONDS >= section_deadline )) && { printf '[Process metadata section time limit reached]\n'; break; }
    exe=$(quick_root readlink -- "/proc/$pid/exe" 2>/dev/null) || {
      inaccessible=$((inaccessible+1)); continue;
    }
    case "$comm:$exe" in
      java:*|java[0-9]*:*|*'/java'|*'/java (deleted)'|*'(deleted)'*|*memfd:*|*:/tmp/*|*:/var/tmp/*|*:/dev/shm/*|*:/srv/mjsec/lms/uploads/*|xmrig:*|kinsing:*|kdevtmpfsi:*|kthreaddk:*|cryptominer:*) ;;
      *) continue ;;
    esac
    selected=$((selected+1))
    (( selected > 60 )) && { printf '[Selected process limit reached]\n'; break; }
    printf '\nPID=%s comm=%q executable=%q\n' "$pid" "$comm" "$exe"
    run_root 4 12 ps -p "$pid" -o pid,ppid,sid,user,lstart,etimes,stat,comm
    run_root 4 12 grep -E '^(Name|State|Pid|PPid|Uid|Gid|NSpid|Threads):' "/proc/$pid/status"
    run_root 4 15 cat "/proc/$pid/cgroup"
    run_root 4 5 stat -Lc 'executable mode=%A uid=%u gid=%g size=%s inode=%i links=%h mtime=%y ctime=%z' "/proc/$pid/exe"
    if [[ ! ${hashed["$exe"]+yes} ]]; then
      hashed["$exe"]=1
      size=$(quick_root stat -Lc %s "/proc/$pid/exe" 2>/dev/null) || size=invalid
      if [[ $size =~ ^[0-9]+$ ]] && (( size <= 67108864 && size <= binary_budget )); then
        binary_budget=$((binary_budget-size))
        run_root 5 3 sha256sum "/proc/$pid/exe"
      else
        printf '[Executable hash skipped: size/unavailable/budget]\n'
      fi
    fi
    run_root 4 45 grep -F ' (deleted)' "/proc/$pid/maps"
    run_root 4 45 find "/proc/$pid/fd" -maxdepth 1 -type l -lname '* (deleted)' -printf '%p -> %l\n'
    clean=${exe% (deleted)}
    if [[ $comm == java* || $clean == */java ]]; then
      home=${clean%/bin/java}
      if [[ $home != "$clean" && $home == /* && $home != *'/../'* ]]; then
        release="/proc/$pid/root$home/release"
        printf 'Java release file candidate=%q (read only; Java never launched)\n' "$release"
        run_root 4 4 stat -Lc 'mode=%A uid=%u gid=%g size=%s mtime=%y ctime=%z' -- "$release"
        run_root 4 20 grep -E '^(JAVA_VERSION|JAVA_RUNTIME_VERSION|IMPLEMENTOR|IMPLEMENTOR_VERSION|OS_NAME|OS_ARCH|LIBC)=' -- "$release"
      else
        printf '[Java release file could not be derived from executable path]\n'
      fi
    fi
  done < <(enumerate_root 5 ps -eo pid=,comm=)
  printf '\nScanned=%s selected=%s readlink_unavailable=%s (exited/kernel/denied may all count)\n' "$seen_count" "$selected" "$inaccessible"
}

CONTAINERS=()
docker_inventory() {
  local cid count=0
  printf 'Docker access failure may mean unavailable daemon or insufficient rights.\n'
  run_root 6 12 docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
  run_root 6 15 docker info --format 'name={{.Name}} version={{.ServerVersion}} storage={{.Driver}} cgroup={{.CgroupDriver}} root={{.DockerRootDir}} logging={{.LoggingDriver}} live_restore={{.LiveRestoreEnabled}} security={{json .SecurityOptions}}'
  run_root 8 160 docker ps -a --no-trunc --format 'id={{.ID}} name={{.Names}} image={{.Image}} state={{.State}} status={{.Status}} ports={{.Ports}}'
  while IFS= read -r cid; do
    [[ $cid =~ ^[a-f0-9]{12,64}$ ]] || continue
    count=$((count+1))
    (( count > MAX_CONTAINERS )) && continue
    CONTAINERS+=("$cid")
  done < <(enumerate_root 5 docker ps -aq --no-trunc)
  printf 'Container enumeration=%s; detailed selection=%s; newest-first Docker default order\n' "$count" "${#CONTAINERS[@]}"
  (( count > MAX_CONTAINERS )) && printf '[Container count exceeded detail budget]\n'
  return 0
}

docker_details() {
  local cid
  for cid in "${CONTAINERS[@]}"; do
    printf '\n--- container %s selected inspect fields (Config.Env excluded) ---\n' "$cid"
    run_root 7 80 docker inspect --type container --format \
      'id={{.Id}} name={{.Name}} created={{.Created}} image_ref={{.Config.Image}} image_id={{.Image}} executable={{.Path}}
state={{.State.Status}} running={{.State.Running}} paused={{.State.Paused}} restarting={{.State.Restarting}} oom_killed={{.State.OOMKilled}} dead={{.State.Dead}} exit_code={{.State.ExitCode}} host_pid={{.State.Pid}} started={{.State.StartedAt}} finished={{.State.FinishedAt}} restart_count={{.RestartCount}}
privileged={{.HostConfig.Privileged}} readonly_rootfs={{.HostConfig.ReadonlyRootfs}} cap_add={{json .HostConfig.CapAdd}} cap_drop={{json .HostConfig.CapDrop}} security_options={{json .HostConfig.SecurityOpt}}
pid_mode={{.HostConfig.PidMode}} network_mode={{.HostConfig.NetworkMode}} ipc_mode={{.HostConfig.IpcMode}} restart_policy={{json .HostConfig.RestartPolicy}} container_user={{.Config.User}}
compose_project={{index .Config.Labels "com.docker.compose.project"}} compose_service={{index .Config.Labels "com.docker.compose.service"}} compose_workdir={{index .Config.Labels "com.docker.compose.project.working_dir"}} compose_config_paths={{index .Config.Labels "com.docker.compose.project.config_files"}}
log_driver={{.HostConfig.LogConfig.Type}} log_path={{.LogPath}}
{{range .Mounts}}mount type={{.Type}} source={{.Source}} destination={{.Destination}} rw={{.RW}} propagation={{.Propagation}}
{{end}}{{range $name, $net := .NetworkSettings.Networks}}network={{$name}} ipv4={{$net.IPAddress}} ipv6={{$net.GlobalIPv6Address}} gateway={{$net.Gateway}}
{{end}}ports={{json .NetworkSettings.Ports}}' "$cid"
    run_root 6 30 docker image inspect --format 'id={{.Id}} created={{.Created}} tags={{json .RepoTags}} digests={{json .RepoDigests}} architecture={{.Architecture}} os={{.Os}} user={{.Config.User}}' \
      "$(quick_root docker inspect --type container --format '{{.Image}}' "$cid" 2>/dev/null)"
    printf 'Container process ancestry (no args):\n'
    run_root 7 100 docker top "$cid" -eo pid,ppid,user,etimes,comm
    printf 'Docker filesystem diff (paths/change types only; no file contents):\n'
    run_root 9 450 docker diff "$cid"
    printf 'Container log excerpt: since 30 days, last 240 lines; encrypted handling required.\n'
    run_log_root 8 260 docker logs --timestamps --since 720h --tail 240 "$cid"
  done
}

docker_events() {
  printf 'Docker events since 7 days; daemon retains a limited event buffer.\n'
  printf 'Daemon restarts/rotation/buffer limits can erase history; not a complete audit.\n'
  run_log_root 10 400 docker events --since 168h --until "$(date -u +%FT%TZ)" \
    --format 'time_ns={{.TimeNano}} type={{.Type}} id={{.ID}} name={{index .Actor.Attributes "name"}} image={{index .Actor.Attributes "image"}} compose_service={{index .Actor.Attributes "com.docker.compose.service"}} action={{.Action}}'
}

auth_journal() {
  printf 'Journal 30-day auth, scheduler and Docker service excerpt (newest 1400 entries).\n'
  run_log_root 15 1450 journalctl --no-pager --since '30 days ago' -n 1400 -o short-iso-precise \
    -u ssh.service -u sshd.service -u sudo.service -u docker.service -u containerd.service -u cron.service -u crond.service
  printf 'Journal auth facilities, newest 600 entries within 30 days:\n'
  run_log_root 10 650 journalctl --no-pager --since '30 days ago' -n 600 -o short-iso-precise SYSLOG_FACILITY=4 SYSLOG_FACILITY=10
  printf 'Journal warnings/errors, newest 500 entries within 30 days:\n'
  run_log_root 10 550 journalctl --no-pager --since '30 days ago' -p warning -n 500 -o short-iso-precise
  run_root 8 110 last -F -n 100
  run_root 8 110 lastb -F -n 100
  run_root 8 160 lastlog -b 30
}

accounts_persistence() {
  local path user home n=0
  HASH_REMAIN=33554432; HASH_COUNT=0
  printf 'Account records contain no password hashes. Sudo rules are metadata only.\n'
  run_root 6 350 getent passwd
  run_root 6 30 getent group sudo wheel docker adm systemd-journal
  run_root 6 160 systemctl list-timers --all --no-pager --no-legend
  run_root 6 220 systemctl list-unit-files --no-pager --no-legend --state=enabled,enabled-runtime,linked,linked-runtime
  printf 'Local/custom systemd, cron, sudoers, rc.local metadata; no contents/commands:\n'
  while IFS= read -r -d '' path; do
    n=$((n+1)); (( n > 220 )) && { printf '[Persistence file limit reached]\n'; break; }
    metadata_path "$path"
  done < <(enumerate_root 12 find \
    /etc/systemd/system /usr/local/lib/systemd/system /etc/crontab /etc/cron.d /etc/cron.hourly \
    /etc/cron.daily /etc/cron.weekly /etc/cron.monthly /var/spool/cron /etc/sudoers /etc/sudoers.d /etc/rc.local \
    -xdev -maxdepth 3 \( -type f -o -type l \) -print0)
  printf '\nLoaded custom-unit properties (no ExecStart/environment properties):\n'
  local unit count=0 fragment
  while read -r unit; do
    [[ $unit == *.service || $unit == *.timer ]] || continue
    fragment=$(quick_root systemctl show "$unit" -p FragmentPath --value 2>/dev/null) || continue
    case "$fragment" in /etc/systemd/system/*|/usr/local/lib/systemd/system/*) ;; *) continue ;; esac
    count=$((count+1)); (( count > 60 )) && { printf '[Custom-unit property limit reached]\n'; break; }
    run_root 4 20 systemctl show "$unit" -p Id -p FragmentPath -p DropInPaths -p UnitFileState \
      -p ActiveState -p SubState -p MainPID -p User -p Group -p WorkingDirectory
  done < <(quick_root systemctl list-units --all --no-legend --plain --no-pager --type=service,timer 2>/dev/null | awk '{print $1}')
  printf '\nAuthorized-key file metadata and fingerprints only (no key/comment output):\n'
  n=0
  while IFS=: read -r user _ _ _ _ home _; do
    [[ $home == /* && $home != / && $home != *'/../'* ]] || continue
    n=$((n+1)); (( n > 300 )) && { printf '[Account home enumeration limit reached]\n'; break; }
    for path in "$home/.ssh/authorized_keys" "$home/.ssh/authorized_keys2"; do
      if quick_root test -f "$path"; then
        printf 'account=%q key_file=%q\n' "$user" "$path"
        run_root 4 3 stat -c 'mode=%A uid=%u gid=%g size=%s mtime=%y ctime=%z name=%n' -- "$path"
        timeout -k 1s 4s "${ROOT[@]}" ssh-keygen -lf "$path" 2>&1 |
          awk '($1 ~ /^[0-9]+$/ && $2 ~ /^(SHA256:|MD5:)/) {print "bits=" $1 " fingerprint=" $2 " algorithm=" $NF; next} {print "[Fingerprint unavailable or unrecognized key; no key contents emitted]"}' |
          limit_output 80 0
        printf '[fingerprint_command_exit=%s]\n' "${PIPESTATUS[0]}"
      fi
    done
  done < <(quick_root getent passwd 2>/dev/null)
}

recent_files() {
  local base=$1 depth=$2 limit=$3 path n=0
  HASH_REMAIN=33554432; HASH_COUNT=0
  printf 'Root=%q; files/symlinks changed (mtime OR ctime) within 30 days; depth=%s cap=%s\n' "$base" "$depth" "$limit"
  printf 'Filesystem traversal time limited to 15s, one filesystem, no directory symlink following.\n'
  run_root 4 3 stat -c 'root mode=%A uid=%u gid=%g mtime=%y ctime=%z name=%n' -- "$base"
  while IFS= read -r -d '' path; do
    n=$((n+1)); (( n > limit )) && { printf '[Recent-file selection limit reached; find order, not chronological]\n'; break; }
    metadata_path "$path"
    (( SECONDS - START_SECONDS >= DEADLINE_SECONDS )) && break
  done < <(enumerate_root 15 find "$base" -xdev -maxdepth "$depth" \
    \( -type f -o -type l \) \( -mtime -30 -o -ctime -30 \) -print0)
  printf 'Emitted metadata candidates=%s; hashes=%s; remaining hash budget=%s bytes\n' "$n" "$HASH_COUNT" "$HASH_REMAIN"
  printf '[Selection can omit older files, deep files, other mounts and files beyond limits]\n'
}

log_windows() {
  local path n=0
  printf 'Journal availability/retention and rotated-log metadata only:\n'
  run_root 6 15 journalctl --disk-usage
  run_root 6 45 journalctl --list-boots --no-pager
  printf 'Oldest retained journal record timestamp (message deliberately suppressed):\n'
  timeout -k 1s 5s "${ROOT[@]}" journalctl --quiet --no-pager --all -o short-iso-precise 2>/dev/null |
    awk 'NR==1 {print $1; exit}'
  printf '[oldest_record_pipeline_status=%s (SIGPIPE after first record may be expected)]\n' "${PIPESTATUS[*]}"
  printf 'Current newest journal record timestamp:\n'
  timeout -k 1s 5s "${ROOT[@]}" journalctl --quiet --no-pager -n 1 -o short-iso-precise 2>/dev/null |
    awk 'NR==1 {print $1}'
  printf '[newest_record_pipeline_status=%s]\n' "${PIPESTATUS[*]}"
  while IFS= read -r -d '' path; do
    n=$((n+1)); (( n > 180 )) && { printf '[Log metadata file limit reached]\n'; break; }
    run_root 3 2 stat -c 'mode=%A uid=%u gid=%g bytes=%s mtime=%y ctime=%z name=%n' -- "$path"
  done < <(enumerate_root 10 find /var/log /srv/mjsec/lms/logs \
    -xdev -maxdepth 3 -type f \
    \( -name '*auth*' -o -name '*secure*' -o -name '*nginx*' -o -name '*access*log*' -o -name '*error*log*' -o -name '*syslog*' -o -name '*messages*' -o -name '*wtmp*' -o -name '*btmp*' -o -name '*journal*' -o -name '*.log*' \) \
    -print0)
  printf 'Timestamps show file availability, not guaranteed coverage. Rotated compressed logs are not decompressed.\n'
}

host_log_excerpts() {
  local path n=0
  printf 'Known auth/nginx/application log paths only; last 250 lines each.\n'
  printf 'These file excerpts can predate 30 days. Request query strings and common credentials are redacted.\n'
  while IFS= read -r -d '' path; do
    n=$((n+1)); (( n > 20 )) && { printf '[Host-log excerpt limit reached]\n'; break; }
    printf '\n--- log_file=%q ---\n' "$path"
    run_log_root 5 260 tail -n 250 -- "$path"
  done < <(enumerate_root 10 find \
    /var/log/nginx /srv/mjsec/lms/logs /var/log/auth.log /var/log/auth.log.1 /var/log/secure /var/log/secure.1 \
    -xdev -maxdepth 2 -type f \( -name '*.log' -o -name '*.log.1' -o -name secure -o -name secure.1 \) \
    -print0)
}

section 'collector_scope_and_host_clock' intro
section 'process_ancestry_sockets_and_sessions' process_network
section 'java_and_suspicious_executable_metadata' runtime_processes
section 'docker_inventory' docker_inventory
section 'docker_events_7_days_limited_buffer' docker_events
section 'host_auth_journal_30_days_and_login_history' auth_journal
section 'log_availability_and_rotation_window' log_windows
section 'host_nginx_application_auth_log_excerpts' host_log_excerpts
section 'docker_selected_metadata_diff_and_logs' docker_details
section 'accounts_groups_persistence_and_key_fingerprints' accounts_persistence
section 'recent_upload_metadata' recent_files /srv/mjsec/lms/uploads 4 180
section 'recent_tmp_metadata' recent_files /tmp 3 100
section 'recent_var_tmp_metadata' recent_files /var/tmp 3 100
section 'recent_shared_memory_metadata' recent_files /dev/shm 3 100
printf '\n===== COLLECTION FINISHED | UTC %s | elapsed_seconds=%s =====\n' \
  "$(date -u +%FT%TZ)" "$((SECONDS-START_SECONDS))"
printf 'Review all command statuses, omissions and collection limits. This report does not establish a clean host.\n'
exit 0
