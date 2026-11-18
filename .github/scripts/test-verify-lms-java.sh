#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/verify-lms-java.sh"

runtime() {
  printf '    java.vendor = %s\n    java.runtime.version = %s\n' "$2" "$1"
}

for version in 17.0.21.1+2-LTS 17.0.21.1+3-LTS 17.0.21.2+1-LTS 17.0.22+1-LTS 17.1.0+1-LTS; do
  if ! runtime "$version" 'Amazon.com Inc.' | validate_runtime >/dev/null 2>&1; then
    echo "Expected accepted version: $version" >&2
    exit 1
  fi
done

for version in 17.0.21+9-LTS 17.0.21.0+99-LTS 17.0.21.1+1-LTS 17.0.20.100+100-LTS \
  21.0.13.1+2-LTS 17.0.21.1+2-ea 17.0.021.1+2-LTS 17.0.21.1+2-LTS-unknown \
  17.0.21.1+2 17.0.21.1+9999999-LTS; do
  if runtime "$version" 'Amazon.com Inc.' | validate_runtime >/dev/null 2>&1; then
    echo "Expected rejected version: $version" >&2
    exit 1
  fi
done

if runtime '17.0.21.1+2-LTS' 'Eclipse Adoptium' | validate_runtime >/dev/null 2>&1; then
  echo 'Expected rejected vendor' >&2
  exit 1
fi
if { runtime '17.0.21.1+2-LTS' 'Amazon.com Inc.'; echo '    java.vendor = Amazon.com Inc.'; } |
  validate_runtime >/dev/null 2>&1; then
  echo 'Expected rejected duplicate property' >&2
  exit 1
fi
if printf '    java.vendor = Amazon.com Inc.\n' | validate_runtime >/dev/null 2>&1; then
  echo 'Expected rejected missing version' >&2
  exit 1
fi
echo 'Passed 18 runtime validation cases.'
