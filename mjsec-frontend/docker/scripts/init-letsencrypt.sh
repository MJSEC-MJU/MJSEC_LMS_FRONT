#!/usr/bin/env bash
set -euo pipefail

# 0) .env 로딩
if [[ -f .env ]]; then
  set -o allexport
  source .env
  set +o allexport
fi

# 1) 파라미터/ENV 확인
DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${EMAIL:-}}"
[[ -z "$DOMAIN" ]] && { echo "❌ DOMAIN 이 없습니다"; exit 1; }

# 2) Certbot 이메일 옵션
if [[ -z "$EMAIL" ]]; then
  echo "⚠️  EMAIL 미입력 → --register-unsafely-without-email"
  EMAIL_OPT="--register-unsafely-without-email --no-eff-email"
else
  EMAIL_OPT="--email $EMAIL --no-eff-email"
fi

echo "▶︎ DOMAIN = $DOMAIN"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

# 3) Certbot 1회 발급
docker compose \
  --env-file .env \
  -f mjsec-frontend/docker-compose.prod.yaml \
  run --rm \
  --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  --agree-tos $EMAIL_OPT \
  -d "$DOMAIN"
