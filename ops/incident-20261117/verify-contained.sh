#!/usr/bin/env bash
set +e
VERIFY_FAILURE=0
export LC_ALL=C TZ=UTC
printf 'POST_CONTAINMENT_VERIFICATION\n'
date -u +%FT%TZ
timeout -k 1 8 docker ps -a --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}} {{.Ports}}'
timeout -k 1 8 docker inspect -f 'name={{.Name}} running={{.State.Running}} pid={{.State.Pid}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} finished={{.State.FinishedAt}} restart={{.HostConfig.RestartPolicy.Name}}' 4a77e8b7a503 ddf8ee91db1d
states=$(timeout -k 1 8 docker inspect -f '{{.State.Running}}' 4a77e8b7a503 ddf8ee91db1d)
if [[ "$states" != $'false\nfalse' ]]; then VERIFY_FAILURE=1; fi
printf 'NGINX_CONFIG_TEST\n'
timeout -k 1 8 docker exec nginx nginx -t
nginx_rc=$?
printf 'NGINX_TEST_RC=%s\n' "$nginx_rc"
if [[ "$nginx_rc" != 0 ]]; then VERIFY_FAILURE=1; fi
timeout -k 1 8 docker exec nginx sh -c 'printf "active_maintenance_count="; grep -c "return 503;" /etc/nginx/conf.d/default.conf; printf "active_lms_upstream_count="; grep -Ec "^[[:space:]]*proxy_pass.*lms-(back|front)" /etc/nginx/conf.d/default.conf || true; sha256sum /etc/nginx/conf.d/default.conf'
active_count=$(timeout -k 1 8 docker exec nginx grep -c 'return 503;' /etc/nginx/conf.d/default.conf)
if [[ "$active_count" != 3 ]]; then VERIFY_FAILURE=1; fi
printf 'PERSISTENT_TEMPLATE\n'
stat -c '%a %u %g %s %y %n' /srv/mjsec/nginx/default.conf.template
printf 'host_template_maintenance_count='
grep -c 'return 503;' /srv/mjsec/nginx/default.conf.template
if [[ $(grep -c 'return 503;' /srv/mjsec/nginx/default.conf.template) != 3 ]]; then VERIFY_FAILURE=1; fi
sha256sum /srv/mjsec/nginx/default.conf.template
printf 'HOST_JAVA_PROCESS_NAMES\n'
ps -eo pid,ppid,user,stat,comm | awk 'NR==1 || tolower($5) ~ /java|xmrig|kinsing|kdevtmpfsi|cryptominer/'
printf 'ROOT_METADATA_READER_START controlled_temporary_container=true network=none mounts=readonly\n'
timeout -k 2 25 docker run --rm --pull never --name codex-mjsec-readonly-audit-20261117 --label codex.incident=20261117 --network none --read-only --cap-drop ALL --cap-add DAC_READ_SEARCH --security-opt no-new-privileges:true --mount type=bind,source=/etc,target=/host-etc,readonly --mount type=bind,source=/root,target=/host-root,readonly --mount type=bind,source=/var/spool/cron,target=/host-cron,readonly --entrypoint sh sha256:3dd08163706a20b20622f310ec10258cc96e9007ab357f7201955bc880ac17f4 -c '
  for f in /host-etc/crontab /host-etc/cron.d/* /host-cron/crontabs/* /host-etc/systemd/system/*.service /host-etc/systemd/system/*.timer /host-etc/ssh/sshd_config /host-etc/ssh/sshd_config.d/*.conf /host-etc/sudoers.d/deploy-mjsec /host-root/.ssh/authorized_keys /host-root/.config/systemd/user/*.service /host-root/.config/systemd/user/*.timer; do
    [ -f "$f" ] && [ ! -L "$f" ] || continue
    printf "\nROOT_FILE %s\n" "$f"
    stat -c "%a %u %g %s %y %n" "$f"
    sha256sum "$f"
    size=$(stat -c %s "$f")
    if [ "$size" -le 65536 ]; then sed -n "1,140p" "$f"; else echo "CONTENT_SKIPPED_SIZE"; fi
  done'
reader_rc=$?
printf 'ROOT_READER_RC=%s\n' "$reader_rc"
# Remove only this audit-owned reader if the CLI timed out before auto-removal.
if [ "$(timeout -k 1 4 docker inspect -f '{{index .Config.Labels "codex.incident"}}' codex-mjsec-readonly-audit-20261117 2>/dev/null)" = 20261117 ]; then
  timeout -k 1 8 docker rm -f codex-mjsec-readonly-audit-20261117
fi
printf 'POST_CONTAINMENT_VERIFICATION_END\n'
printf 'CONTAINMENT_VERIFICATION_FAILURE=%s\n' "$VERIFY_FAILURE"
