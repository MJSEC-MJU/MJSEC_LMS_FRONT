#!/usr/bin/env bash
set -euo pipefail

# ───── 0) .env 로드 (있으면) ───────────────────────────────
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${EMAIL:-}}"
[[ -z "$DOMAIN" ]] && { echo "DOMAIN 필요"; exit 1; }

EMAIL_OPT="--register-unsafely-without-email --no-eff-email"
[[ -n "${EMAIL:-}" ]] && EMAIL_OPT="--email $EMAIL --no-eff-email"

echo "▶︎ DOMAIN = $DOMAIN"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

COMPOSE="docker compose --env-file .env -f mjsec-frontend/docker-compose.prod.yaml"

# ───── 1) 컨테이너 내부에서 인증서 존재 여부 확인 ──────────
if $COMPOSE run --rm --entrypoint sh certbot -c \
   "[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]"; then
   echo '✅ cert already present – skip'; exit 0
fi

# ───── 2) 최초 발급 (non‑interactive) ──────────────────────
$COMPOSE run --rm \
  --entrypoint certbot certbot \
  certonly --non-interactive --keep-until-expiring \
  --webroot -w /var/www/certbot \
  --agree-tos $EMAIL_OPT \
  -d "$DOMAIN"
echo "🎉  new certificate issued"
