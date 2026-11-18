#!/usr/bin/env bash
set -euo pipefail

# Accept only an unambiguous Corretto 17 LTS runtime at or above the fixed build.
# Keep this function independent of Docker so version boundaries can be checked.
validate_runtime() {
  local line vendor='' version='' vendor_count=0 version_count=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]+java\.vendor[[:space:]]=[[:space:]](.+)$ ]]; then
      vendor="${BASH_REMATCH[1]}"
      vendor_count=$((vendor_count + 1))
    elif [[ "$line" =~ ^[[:space:]]+java\.runtime\.version[[:space:]]=[[:space:]](.+)$ ]]; then
      version="${BASH_REMATCH[1]}"
      version_count=$((version_count + 1))
    fi
  done
  if [[ "$vendor_count" != 1 || "$version_count" != 1 || "$vendor" != 'Amazon.com Inc.' ]]; then
    echo 'LMS deployment rejected: expected one Amazon Corretto runtime.' >&2
    return 1
  fi
  # Bound numeric fields to avoid shell arithmetic overflow; reject EA/unknown suffixes.
  local number='(0|[1-9][0-9]{0,5})'
  if [[ ! "$version" =~ ^17\.$number\.$number(\.$number)?\+([1-9][0-9]{0,5})-LTS$ ]]; then
    echo 'LMS deployment rejected: expected an unambiguous Java 17 LTS build.' >&2
    return 1
  fi
  local actual=(17 "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[4]:-0}" "${BASH_REMATCH[5]}")
  local minimum=(17 0 21 1 2) i
  for i in "${!minimum[@]}"; do
    if (( actual[i] > minimum[i] )); then
      echo "Verified Amazon Corretto $version." >&2
      return 0
    elif (( actual[i] < minimum[i] )); then
      echo 'LMS deployment rejected: Java is older than Corretto 17.0.21.1+2-LTS.' >&2
      return 1
    fi
  done
  echo "Verified Amazon Corretto $version." >&2
}

verify_image() {
  local candidate="$1" repository digest image_id immutable runtime
  if [[ ! "$candidate" =~ ^[a-z0-9]+([._-][a-z0-9]+)*/mjsec-lms-back:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
    echo 'LMS deployment rejected: invalid backend image reference.' >&2
    return 1
  fi
  repository="${candidate%:*}"
  docker pull "$candidate" >&2
  image_id="$(docker image inspect --format '{{.Id}}' "$candidate")"
  digest="$(docker image inspect --format '{{json .RepoDigests}}' "$candidate" |
    jq -er --arg repo "$repository" '
      [.[] | select((split("@")[0] == $repo) or (split("@")[0] == ("docker.io/" + $repo)))
       | split("@")[1]] | unique | if length == 1 then .[0] else error("ambiguous image digest") end')"
  if [[ ! "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]; then
    echo 'LMS deployment rejected: missing immutable image digest.' >&2
    return 1
  fi
  immutable="$repository@$digest"
  if [[ "$(docker image inspect --format '{{.Id}}' "$immutable")" != "$image_id" ]]; then
    echo 'LMS deployment rejected: resolved image identity changed.' >&2
    return 1
  fi
  runtime="$(docker run --rm --pull=never --network none --read-only \
    --cap-drop ALL --security-opt no-new-privileges --pids-limit 64 --memory 256m \
    --user 65534:65534 --env JAVA_TOOL_OPTIONS= --env JDK_JAVA_OPTIONS= --env _JAVA_OPTIONS= \
    --entrypoint java "$immutable" -XshowSettings:properties -version 2>&1)" || {
      echo 'LMS deployment rejected: Java runtime probe failed.' >&2
      return 1
    }
  validate_runtime <<< "$runtime" || return 1
  # The caller deploys this exact digest, never the mutable tag checked above.
  printf 'LMS_BACK_IMAGE=%s\n' "$immutable" >> "${GITHUB_ENV:?GITHUB_ENV is required}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  verify_image "${1:?backend image reference is required}"
fi
