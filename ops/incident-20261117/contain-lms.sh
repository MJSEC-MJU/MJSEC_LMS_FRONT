#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Supplied by the runner as base64 of reviewed repository scripts.
: "${COLLECTOR_B64:?missing collector}"
: "${TRANSFORM_B64:?missing nginx transformer}"
readonly root=/srv/mjsec
readonly compose_file="$root/docker-compose.prod.yaml"
readonly template="$root/nginx/default.conf.template"
readonly active=/etc/nginx/conf.d/default.conf
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$root/.codex-incident-$stamp"
phase=preflight
template_changed=0
active_changed=0
stop_started=0
host_priv=()
docker_cmd=(docker)
if ! timeout -k 1 8 docker ps -q >/dev/null 2>&1; then
  timeout -k 1 8 sudo -n docker ps -q >/dev/null
  docker_cmd=(sudo -n docker)
fi
if sudo -n true 2>/dev/null; then host_priv=(sudo -n); fi
d() { timeout -k 2 35 "${docker_cmd[@]}" "$@"; }
dc() { d compose --project-directory "$root" -f "$compose_file" "$@"; }
test -r "$compose_file"
test -f "$template" && test ! -L "$template"
command -v python3 >/dev/null
command -v curl >/dev/null
mkdir -m 700 "$backup"
printf '%s' "$COLLECTOR_B64" | base64 -d > "$backup/collect-readonly.sh"
printf '%s' "$TRANSFORM_B64" | base64 -d > "$backup/maintenance_config.py"

container_for() {
  local service=$1 expected_image=$2 id label workdir configs image ps_output
  local -a ids
  ps_output=$(dc ps -a -q "$service") || return 1
  mapfile -t ids <<< "$ps_output"
  [[ ${#ids[@]} -eq 1 && ${ids[0]} =~ ^[a-f0-9]{12,64}$ ]] || return 1
  id=${ids[0]}
  label=$(d inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$id") || return 1
  workdir=$(d inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$id") || return 1
  configs=$(d inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$id") || return 1
  image=$(d inspect -f '{{.Config.Image}}' "$id") || return 1
  [[ "$label" == "$service" && "$workdir" == "$root" && "$configs" == "$compose_file" ]] || return 1
  [[ "$image" =~ (^|/)$expected_image(:|@) ]] || return 1
  printf '%s\n' "$id"
}
back=$(container_for lms-back mjsec-lms-back)
front=$(container_for lms-front mjsec-lms-front)
nginx_output=$(dc ps -q nginx)
mapfile -t nginx_ids <<< "$nginx_output"
[[ ${#nginx_ids[@]} -eq 1 && ${nginx_ids[0]} =~ ^[a-f0-9]{12,64}$ ]]
nginx=${nginx_ids[0]}
[[ $(d inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$nginx") == "$root" ]]
d inspect -f '{{json .Mounts}}' "$nginx" | python3 -c 'import json,sys; m=[x for x in json.load(sys.stdin) if x["Destination"]=="/etc/nginx/templates/default.conf.template"]; assert len(m)==1 and m[0]["Source"]=="/srv/mjsec/nginx/default.conf.template"'
d exec "$nginx" test ! -L "$active"
read -r active_mode active_uid active_gid < <(d exec "$nginx" stat -c '%a %u %g' "$active")
[[ "$active_mode" =~ ^[0-7]{3,4}$ && "$active_uid" =~ ^[0-9]+$ && "$active_gid" =~ ^[0-9]+$ ]]

install_active() {
  local source=$1
  d cp "$source" "$nginx:/etc/nginx/conf.d/.codex-default.next"
  d exec "$nginx" sh -c 'chmod "$1" "$4" && chown "$2:$3" "$4" && mv -f "$4" "$5"' sh "$active_mode" "$active_uid" "$active_gid" /etc/nginx/conf.d/.codex-default.next "$active"
}
restore_template() {
  "${host_priv[@]}" cp -p "$backup/template.before" "$root/nginx/.codex-template.restore-$stamp"
  "${host_priv[@]}" mv -f "$root/nginx/.codex-template.restore-$stamp" "$template"
}
collect_history() {
  printf '\n=== READ_ONLY_HISTORY phase=%s ===\n' "$phase"
  # Keep the complete stdout private on the runner; only encrypted evidence is uploaded.
  timeout -k 2 180 bash "$backup/collect-readonly.sh" || printf 'COLLECTION_INCOMPLETE rc=%s\n' "$?"
}
on_error() {
  local rc=${1:-$?}
  trap - ERR TERM HUP
  set +e
  printf '\nCONTAINMENT_ERROR phase=%s rc=%s stop_started=%s\n' "$phase" "$rc" "$stop_started"
  if [[ "$stop_started" == 0 ]]; then
    if [[ "$template_changed" == 1 ]]; then restore_template; fi
    if [[ "$active_changed" == 1 ]]; then
      install_active "$backup/active.before"
      d exec "$nginx" nginx -t && d exec "$nginx" nginx -s reload
    fi
    printf 'PRE_STOP_ROLLBACK_ATTEMPTED\n'
  else
    printf 'POST_STOP_MAINTENANCE_RETAINED; do not restore upstreams before reviewing stopped containers\n'
  fi
  if [[ "$rc" != 129 && "$rc" != 143 ]]; then collect_history; fi
  exit "$rc"
}
trap on_error ERR
trap 'on_error 143' TERM
trap 'on_error 129' HUP

phase=volatile_before
date -u +%Y-%m-%dT%H:%M:%SZ
id
printf 'AUDIT_BACKUP=%s\n' "$backup"
printf 'SSH_CONNECTION=%s\n' "${SSH_CONNECTION:-unknown}"
ps -eo user,pid,ppid,lstart,comm --forest
ss -H -lntup || true
ss -H -ntup | head -n 300 || true
d ps -a --no-trunc --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}} {{.Ports}}'
for id in "$back" "$front" "$nginx"; do
  d inspect -f 'ID={{.Id}} Name={{.Name}} ImageID={{.Image}} Image={{.Config.Image}} State={{json .State}} Restart={{json .HostConfig.RestartPolicy}} Ports={{json .NetworkSettings.Ports}} Mounts={{json .Mounts}}' "$id"
done
d top "$back" -eo pid,ppid,user,lstart,comm || true
d exec "$back" sh -c 'if [ -r /opt/java/openjdk/release ]; then grep -E "^(JAVA_VERSION|JAVA_RUNTIME_VERSION|IMPLEMENTOR|OS_NAME|OS_ARCH)=" /opt/java/openjdk/release; fi' || true
d logs --timestamps --tail 200 "$back" 2>&1 || true
d exec "$nginx" nginx -T > "$backup/nginx-full.before" 2>&1
d cp "$nginx:$active" "$backup/active.before"
"${host_priv[@]}" cp -p "$template" "$backup/template.before"

http_code() {
  local domain=$1 path=$2
  # The host's published-port loopback is unavailable on this server. Probe the
  # same nginx instance from its own network namespace, without auth or data.
  d exec "$nginx" sh -c '
    if command -v curl >/dev/null 2>&1; then
      curl --insecure --noproxy "*" --silent --show-error --connect-timeout 3 --max-time 8 --resolve "$1:443:127.0.0.1" -o /dev/null -w "%{http_code}" "https://$1$2"
    else
      wget -T 8 -S --no-check-certificate -O /dev/null --header "Host: $1" "https://127.0.0.1$2" 2>&1 |
        awk '\''/^[[:space:]]*HTTP\/[0-9.]+/ {code=$2} END {if (code) print code; else exit 1}'\''
    fi' sh "$domain" "$path"
}
home_before=$(http_code mjsec.kr /)
wiki_before=$(http_code wiki.mjsec.kr /)
[[ "$home_before" != 000 && "$wiki_before" != 000 ]]
printf 'HTTP_BEFORE home=%s wiki=%s\n' "$home_before" "$wiki_before"

phase=validate_candidates
python3 "$backup/maintenance_config.py" "$backup/nginx-full.before" "$backup/nginx-full.checked"
python3 "$backup/maintenance_config.py" "$template" "$root/nginx/.codex-template.next-$stamp"
python3 "$backup/maintenance_config.py" "$backup/active.before" "$backup/active.maintenance"
"${host_priv[@]}" chmod --reference="$template" "$root/nginx/.codex-template.next-$stamp"
"${host_priv[@]}" chown --reference="$template" "$root/nginx/.codex-template.next-$stamp"

phase=install_maintenance
template_changed=1
"${host_priv[@]}" mv -f "$root/nginx/.codex-template.next-$stamp" "$template"
active_changed=1
install_active "$backup/active.maintenance"
d exec "$nginx" nginx -t
d exec "$nginx" nginx -s reload
maintenance_ready=0
for attempt in {1..10}; do
  page=$(http_code mjsec.kr /lms/)
  api=$(http_code mjsec.kr /lms/api/)
  image=$(http_code mjsec.kr /lms/api/v1/image/)
  if [[ "$page" == 503 && "$api" == 503 && "$image" == 503 ]]; then maintenance_ready=1; break; fi
  sleep 1
done
[[ "$maintenance_ready" == 1 ]]
[[ $(http_code mjsec.kr /) == "$home_before" && $(http_code wiki.mjsec.kr /) == "$wiki_before" ]]
printf 'MAINTENANCE_ROUTES_CONFIRMED page=%s api=%s image=%s\n' "$page" "$api" "$image"

phase=stop_lms
stop_started=1
d stop --time 20 "$back" "$front"
[[ $(d inspect -f '{{.State.Running}}' "$back") == false ]]
[[ $(d inspect -f '{{.State.Running}}' "$front") == false ]]
d exec "$nginx" nginx -t
[[ $(http_code mjsec.kr /lms/) == 503 ]]
[[ $(http_code mjsec.kr /lms/api/) == 503 ]]
[[ $(http_code mjsec.kr /lms/api/v1/image/) == 503 ]]
[[ $(http_code mjsec.kr /) == "$home_before" && $(http_code wiki.mjsec.kr /) == "$wiki_before" ]]
phase=contained
printf '\nCONTAINMENT_SUCCESS back_running=false front_running=false home=%s wiki=%s\n' "$home_before" "$wiki_before"
printf 'RECOVERY: review evidence and fixed Java build; start these preserved LMS containers before restoring template.before and active.before, then nginx -t/reload; re-enable FRONT CD only after maintenance is intentionally removed.\n'
printf 'TEMPLATE_BIND_NOTE: current nginx template mount still points to its old inode; active config was changed independently; do not rerun envsubst from that old mount.\n'
d ps -a --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}} {{.Ports}}'
collect_history
