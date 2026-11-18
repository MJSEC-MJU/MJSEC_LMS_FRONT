#!/usr/bin/env bash
# Run only through the reviewed, pinned-host restore workflow. All output is private evidence.
# Arguments: Docker Hub repository, dedicated immutable tag, manifest digest.
# TRANSFORM_B64 is the reviewed maintenance_config.py supplied by the workflow.
set -Eeuo pipefail
umask 077

[[ $# == 3 ]] || { echo 'Expected repository, dedicated tag, and digest.' >&2; exit 2; }
readonly repository=$1 image_tag=$2 image_digest=$3
[[ "$repository" == mjsec0710/mjsec-lms-back ]]
[[ "$image_tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ && "$image_tag" != latest ]]
[[ "$image_digest" =~ ^sha256:[a-f0-9]{64}$ ]]
: "${TRANSFORM_B64:?reviewed maintenance transformer is required}"
readonly digest_ref="$repository@$image_digest" tagged_ref="$repository:$image_tag"
readonly root=/srv/mjsec compose_file=/srv/mjsec/docker-compose.prod.yaml
readonly template=/srv/mjsec/nginx/default.conf.template active=/etc/nginx/conf.d/default.conf
readonly incident=/srv/mjsec/.codex-incident-20261117T100007Z
readonly expected_template=167e970a99a276ec43f6a9d772128048a7f378d0bee64922e619157b34fd0f80
readonly expected_active=dd1426708c5eb7bab4c837af4d020eb025b14f83855d464bf2054addd492a2e8
readonly api_path='/lms/api/v1/auth/check-student-number?studentNumber=20300000'
readonly stamp=$(date -u +%Y%m%dT%H%M%SZ)
phase=preflight mutation_started=0 backend_changed=0 frontend_changed=0 env_changed=0
docker_cmd=(docker)
host_priv=()
if ! timeout -k 2 10 docker ps -q >/dev/null 2>&1; then
  timeout -k 2 10 sudo -n docker ps -q >/dev/null
  docker_cmd=(sudo -n docker)
fi
if sudo -n true 2>/dev/null; then host_priv=(sudo -n); fi
d() { timeout -k 3 45 "${docker_cmd[@]}" "$@"; }
dl() { timeout -k 5 360 "${docker_cmd[@]}" "$@"; }
dc() { dl compose --project-directory "$root" -f "$compose_file" "$@"; }
for file in "$compose_file" "$template" "$root/.env" "$incident/template.before" "$incident/active.before"; do
  [[ -f "$file" && ! -L "$file" ]]
done
command -v python3 >/dev/null
command -v sha256sum >/dev/null
backup=$(mktemp -d "$root/.codex-restore-$stamp.XXXXXX")
chmod 700 "$backup"
printf '%s' "$TRANSFORM_B64" | base64 -d > "$backup/maintenance_config.py"
printf 'RESTORE_BACKUP=%s\n' "$backup"

container_for() {
  local service=$1 expected=$2 output id label workdir configs image
  local -a ids
  output=$(dc ps -a -q "$service") || return 1
  mapfile -t ids <<< "$output"
  [[ ${#ids[@]} == 1 && ${ids[0]} =~ ^[a-f0-9]{12,64}$ ]] || return 1
  id=${ids[0]}
  label=$(d inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$id") || return 1
  workdir=$(d inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$id") || return 1
  configs=$(d inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$id") || return 1
  image=$(d inspect -f '{{.Config.Image}}' "$id") || return 1
  [[ "$label" == "$service" && "$workdir" == "$root" && "$configs" == "$compose_file" ]] || return 1
  [[ "$image" =~ (^|/)$expected(:|@) ]] || return 1
  printf '%s\n' "$id"
}
back_before=$(container_for lms-back mjsec-lms-back)
front=$(container_for lms-front mjsec-lms-front)
nginx=$(container_for nginx nginx)
[[ $(d inspect -f '{{.State.Running}}' "$back_before") == false ]]
[[ $(d inspect -f '{{.State.Running}}' "$front") == false ]]
[[ $(d inspect -f '{{.State.Running}}' "$nginx") == true ]]
d inspect -f '{{json .Mounts}}' "$nginx" | python3 -c 'import json,sys; m=[x for x in json.load(sys.stdin) if x["Destination"]=="/etc/nginx/templates/default.conf.template"]; assert len(m)==1 and m[0]["Source"]=="/srv/mjsec/nginx/default.conf.template"'
d exec "$nginx" sh -c 'test ! -L /etc/nginx/conf.d/default.conf && { command -v curl >/dev/null || command -v wget >/dev/null; }'
read -r active_mode active_uid active_gid < <(d exec "$nginx" stat -c '%a %u %g' "$active")
[[ "$active_mode" =~ ^[0-7]{3,4}$ && "$active_uid" =~ ^[0-9]+$ && "$active_gid" =~ ^[0-9]+$ ]]
d cp "$nginx:$active" "$backup/active.maintenance"
"${host_priv[@]}" cp "$template" "$backup/template.maintenance"
[[ $(sha256sum "$backup/template.maintenance" | cut -d ' ' -f1) == "$expected_template" ]]
[[ $(sha256sum "$backup/active.maintenance" | cut -d ' ' -f1) == "$expected_active" ]]
# The original files are trusted only if the reviewed transform reproduces the known 503 bytes.
for name in template active; do
  "${host_priv[@]}" cp "$incident/$name.before" "$backup/$name.original"
  "${host_priv[@]}" chown "$(id -u):$(id -g)" "$backup/$name.original"
  chmod 600 "$backup/$name.original"
done
python3 "$backup/maintenance_config.py" "$backup/template.original" "$backup/template.rechecked"
python3 "$backup/maintenance_config.py" "$backup/active.original" "$backup/active.rechecked"
[[ $(sha256sum "$backup/template.rechecked" | cut -d ' ' -f1) == "$expected_template" ]]
[[ $(sha256sum "$backup/active.rechecked" | cut -d ' ' -f1) == "$expected_active" ]]
# Transforming removes the proxy URL itself, so independently pin those three original URLs.
python3 - "$backup/template.original" "$backup/active.original" <<'PY'
from collections import Counter
from pathlib import Path
import re,sys
expected=Counter(['http://lms-back:8080/lms/api/v1/image/','http://lms-back:8080','http://lms-front:80/'])
for name in sys.argv[1:]:
    urls=re.findall(r'^\s*proxy_pass\s+(http://lms-(?:back|front)[^;\s]*);',Path(name).read_text(),re.M)
    assert Counter(urls)==expected, 'unexpected original LMS proxy URL'
PY
"${host_priv[@]}" cp "$root/.env" "$backup/env.before"
"${host_priv[@]}" chown "$(id -u):$(id -g)" "$backup/env.before"
chmod 600 "$backup/env.before"
read -r env_mode env_uid env_gid < <(stat -c '%a %u %g' "$root/.env")
d inspect -f '{{json .Mounts}}' "$back_before" > "$backup/backend-mounts.before"
d inspect -f '{{.Image}}' "$back_before" > "$backup/backend-image.before"
d exec "$nginx" nginx -T > "$backup/nginx-full.before" 2>&1

protected_ids=()
for service in app wiki wiki-db lms-db lms-redis; do
  output=$(dc ps -a -q "$service")
  [[ "$output" =~ ^[a-f0-9]{12,64}$ ]]
  protected_ids+=("$output")
done
protected_ids+=("$nginx")
protected_snapshot() {
  local id
  for id in "${protected_ids[@]}"; do
    d inspect -f '{{.Id}} {{.Image}} {{.State.Running}} {{.State.StartedAt}} {{json .Mounts}}' "$id" || return 1
  done
}
protected_snapshot > "$backup/protected.before"

fetch_response() {
  # Emit body followed by a final status line. BusyBox wget may omit a 409 body;
  # the JSON validator then rejects that response rather than guessing success.
  d exec "$nginx" sh -c '
    if command -v curl >/dev/null 2>&1; then
      curl --insecure --noproxy "*" --silent --show-error --connect-timeout 3 --max-time 10 \
        --resolve "$2:443:127.0.0.1" -w "\n%{http_code}" "$1"
    else
      work=$(mktemp -d /tmp/codex-http.XXXXXX) || exit 1
      trap '\''rm -f "$work/body" "$work/headers"; rmdir "$work"'\'' EXIT HUP INT TERM
      wget -T 10 -S --no-check-certificate -O "$work/body" --header "Host: $2" "$3" 2> "$work/headers"
      status=$(awk '\''/^[[:space:]]*HTTP\/[0-9.]+/ {code=$2} END {if(code) print code}'\'' "$work/headers")
      test -n "$status" || exit 1
      cat "$work/body" || exit 1
      printf "\n%s" "$status"
    fi' sh "$1" "$2" "$3"
}
http_code() {
  fetch_response "https://$1$2" "$1" "https://127.0.0.1$2" | tail -n 1
}
for path in /lms/ /lms/api/ /lms/api/v1/image/; do [[ $(http_code mjsec.kr "$path") == 503 ]]; done
home_before=$(http_code mjsec.kr /)
wiki_before=$(http_code wiki.mjsec.kr /)
[[ "$home_before" =~ ^[23][0-9]{2}$ && "$wiki_before" =~ ^[23][0-9]{2}$ ]]

install_active() {
  d cp "$1" "$nginx:/etc/nginx/conf.d/.codex-restore.next" || return 1
  d exec "$nginx" sh -c 'chmod "$1" "$4" && chown "$2:$3" "$4" && mv -f "$4" "$5"' sh \
    "$active_mode" "$active_uid" "$active_gid" /etc/nginx/conf.d/.codex-restore.next "$active" || return 1
}
install_template() {
  local source=$1 temp="$root/nginx/.codex-restore-template-$stamp"
  "${host_priv[@]}" cp "$source" "$temp" || return 1
  "${host_priv[@]}" chmod --reference="$template" "$temp" || return 1
  "${host_priv[@]}" chown --reference="$template" "$temp" || return 1
  "${host_priv[@]}" mv -f "$temp" "$template" || return 1
}
install_env() {
  local source=$1 temp="$root/.codex-restore-env-$stamp"
  "${host_priv[@]}" cp "$source" "$temp" || return 1
  # Preserve ownership; credentials remain owner-readable only.
  "${host_priv[@]}" chmod 600 "$temp" || return 1
  "${host_priv[@]}" chown "$env_uid:$env_gid" "$temp" || return 1
  "${host_priv[@]}" mv -f "$temp" "$root/.env" || return 1
}
on_error() {
  local rc=${1:-$?} rollback_failed=0 current_back
  trap - ERR TERM HUP
  set +e
  printf 'RESTORE_ERROR phase=%s rc=%s mutation_started=%s\n' "$phase" "$rc" "$mutation_started"
  if [[ "$mutation_started" == 1 ]]; then
    # Reestablish 503 before stopping any service: unresolved static upstreams cannot break nginx.
    install_template "$backup/template.maintenance" || rollback_failed=1
    install_active "$backup/active.maintenance" || rollback_failed=1
    d exec "$nginx" nginx -t && d exec "$nginx" nginx -s reload || rollback_failed=1
    if [[ "$backend_changed" == 1 ]]; then
      current_back=$(container_for lms-back mjsec-lms-back)
      if [[ "$current_back" =~ ^[a-f0-9]{12,64}$ ]]; then d stop --time 20 "$current_back" || rollback_failed=1; else rollback_failed=1; fi
    fi
    if [[ "$frontend_changed" == 1 ]]; then d stop --time 20 "$front" || rollback_failed=1; fi
    if [[ "$env_changed" == 1 ]]; then install_env "$backup/env.before" || rollback_failed=1; fi
    d exec "$nginx" nginx -t || rollback_failed=1
    for path in /lms/ /lms/api/ /lms/api/v1/image/; do [[ $(http_code mjsec.kr "$path") == 503 ]] || rollback_failed=1; done
    [[ $(http_code mjsec.kr /) == "$home_before" && $(http_code wiki.mjsec.kr /) == "$wiki_before" ]] || rollback_failed=1
    protected_snapshot > "$backup/protected.rollback" && cmp -s "$backup/protected.before" "$backup/protected.rollback" || rollback_failed=1
    printf 'ROLLBACK_TO_503 attempted=true verification_failed=%s\n' "$rollback_failed"
  fi
  exit "$rc"
}
trap on_error ERR
trap 'on_error 143' TERM
trap 'on_error 129' HUP

phase=validate_candidate_image
dl pull "$digest_ref"
candidate_id=$(d image inspect -f '{{.Id}}' "$digest_ref")
[[ "$candidate_id" =~ ^sha256:[a-f0-9]{64}$ ]]
d image inspect -f '{{json .RepoDigests}}' "$digest_ref" > "$backup/image-repodigests.json"
python3 - "$backup/image-repodigests.json" "$digest_ref" <<'PY'
import json,sys
assert sys.argv[2] in json.load(open(sys.argv[1]))
PY
d tag "$digest_ref" "$tagged_ref"
[[ $(d image inspect -f '{{.Id}}' "$tagged_ref") == "$candidate_id" ]]
d run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --entrypoint java "$digest_ref" -XshowSettings:properties -version > "$backup/java-candidate.txt" 2>&1
validate_java() {
  python3 - "$1" <<'PY'
import re,sys
text=open(sys.argv[1],encoding='utf-8',errors='replace').read()
properties=dict(re.findall(r'^\s*([\w.]+)\s*=\s*(.*?)\s*$',text,re.M))
assert properties.get('java.runtime.version') in ('17.0.21.1+2','17.0.21.1+2-LTS')
assert properties.get('java.vendor') == 'Amazon.com Inc.'
assert 'Corretto' in properties.get('java.vendor.version','')
PY
}
validate_java "$backup/java-candidate.txt"
# Only the dedicated backend tag changes; retain all other .env bytes without logging values.
python3 - "$backup/env.before" "$backup/env.fixed" "$image_tag" <<'PY'
import re,sys
from pathlib import Path
source=Path(sys.argv[1]).read_bytes()
lines=source.splitlines(keepends=True)
namespace=[]; targets=[]
for i,line in enumerate(lines):
    match=re.match(rb'^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*?)(?:\r?\n)?$',line)
    if not match: continue
    key,value=match.groups()
    if key==b'DOCKERHUB_USER': namespace.append(value.strip().strip(b'\'"'))
    if key==b'LMS_BACK_TAG': targets.append(i)
assert namespace==[b'mjsec0710'], 'unexpected Docker Hub namespace'
assert len(targets)==1, 'expected one backend tag setting'
i=targets[0]; ending=b'\r\n' if lines[i].endswith(b'\r\n') else b'\n' if lines[i].endswith(b'\n') else b''
lines[i]=b'LMS_BACK_TAG='+sys.argv[3].encode('ascii')+ending
with open(sys.argv[2],'xb') as out: out.write(b''.join(lines))
PY
chmod 600 "$backup/env.fixed"

phase=start_fixed_backend
mutation_started=1 env_changed=1
install_env "$backup/env.fixed"
export DOCKERHUB_USER=mjsec0710 LMS_BACK_TAG="$image_tag"
backend_changed=1
dc up -d --no-deps --pull never lms-back
back=$(container_for lms-back mjsec-lms-back)
[[ $(d inspect -f '{{.Image}}' "$back") == "$candidate_id" ]]
[[ $(d inspect -f '{{.State.Running}}' "$back") == true ]]
d inspect -f '{{json .Mounts}}' "$back" > "$backup/backend-mounts.after"
cmp -s "$backup/backend-mounts.before" "$backup/backend-mounts.after"
# Query the executable of PID 1, not merely another java binary on PATH.
d exec "$back" /proc/1/exe -XshowSettings:properties -version > "$backup/java-running.txt" 2>&1
validate_java "$backup/java-running.txt"

probe_backend() {
  local public=${1:-false}
  if [[ "$public" == true ]]; then
    fetch_response "https://mjsec.kr$api_path" mjsec.kr "https://127.0.0.1$api_path" > "$backup/api-probe.txt" || return 1
  else
    fetch_response "http://lms-back:8080$api_path" lms-back "http://lms-back:8080$api_path" > "$backup/api-probe.txt" || return 1
  fi
  python3 - "$backup/api-probe.txt" <<'PY'
import json,sys
body,status=open(sys.argv[1],encoding='utf-8').read().rsplit('\n',1)
data=json.loads(body)
assert data.get('code')=='SUCCESS'
assert (status=='200' and data.get('data') is True) or (status=='409' and data.get('data') is False)
PY
}
phase=internal_application_smoke
ready=0
for attempt in {1..40}; do
  if probe_backend; then ready=1; break; fi
  [[ $(d inspect -f '{{.State.Running}}' "$back") == true ]]
  sleep 3
done
[[ "$ready" == 1 ]]
frontend_changed=1
d start "$front"
[[ $(d inspect -f '{{.State.Running}}' "$front") == true ]]
ready=0
for attempt in {1..10}; do
  if [[ $(fetch_response http://lms-front/ lms-front http://lms-front/ | tail -n 1) == 200 ]]; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
protected_snapshot > "$backup/protected.internal"
cmp -s "$backup/protected.before" "$backup/protected.internal"

phase=reopen_verified_lms
install_template "$backup/template.original"
install_active "$backup/active.original"
d exec "$nginx" nginx -t
d exec "$nginx" nginx -s reload
ready=0
for attempt in {1..10}; do
  if [[ $(http_code mjsec.kr /lms/) == 200 ]] && probe_backend true; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
[[ $(http_code mjsec.kr /) == "$home_before" && $(http_code wiki.mjsec.kr /) == "$wiki_before" ]]
[[ $(d inspect -f '{{.Image}}' "$back") == "$candidate_id" && $(d inspect -f '{{.State.Running}}' "$back") == true ]]
[[ $(d inspect -f '{{.State.Running}}' "$front") == true ]]
protected_snapshot > "$backup/protected.after"
cmp -s "$backup/protected.before" "$backup/protected.after"
sha256sum "$template" "$backup/active.maintenance" "$backup/java-running.txt" > "$backup/verified.sha256"
phase=restored
printf 'RESTORE_SUCCESS repository=%s tag=%s digest=%s image_id=%s java=17.0.21.1+2 vendor=Corretto home=%s wiki=%s\n' \
  "$repository" "$image_tag" "$image_digest" "$candidate_id" "$home_before" "$wiki_before"
printf 'FRONT_CD remains disabled until its durable fixed-image policy is separately verified.\n'
