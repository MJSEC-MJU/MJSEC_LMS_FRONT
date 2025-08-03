#!/usr/bin/env bash
set -euo pipefail

# 0) .env 로드
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${EMAIL:-}}"
[[ -z "$DOMAIN" ]] && { echo "DOMAIN 필요"; exit 1; }

EMAIL_OPT="--register-unsafely-without-email --no-eff-email"
[[ -n "$EMAIL" ]] && EMAIL_OPT="--email $EMAIL --no-eff-email"

echo "▶︎ DOMAIN = $DOMAIN"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

# ── 1) 인증서 존재 여부를 컨테이너 내부에서 확인 ─────────────
docker compose run --rm \
  --entrypoint sh certbot -c "
  if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
      echo present; exit 0; else exit 42; fi" \
  && { echo '✅ cert already present'; exit 0; } || true

# ── 2) 최초 발급 (Non‑interactive, 재발급 안 함) ────────────────
docker compose run --rm \
  --entrypoint certbot certbot \
  certonly --non-interactive --keep-until-expiring \
  --webroot -w /var/www/certbot \
  --agree-tos $EMAIL_OPT \
  -d "$DOMAIN"
