#!/usr/bin/env bash
set -euo pipefail
[[ -f .env ]] && { set -a; . ./.env; set +a; }

DOMAIN="${1:-${DOMAIN:-}}"; EMAIL="${2:-${EMAIL:-}}"
[[ -z "$DOMAIN" ]] && { echo "DOMAIN 필요"; exit 1; }

EMAIL_OPT="--register-unsafely-without-email --no-eff-email"
[[ -n "${EMAIL:-}" ]] && EMAIL_OPT="--email $EMAIL --no-eff-email"

echo "▶︎ DOMAIN = $DOMAIN"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

COMPOSE="docker compose --env-file .env -f mjsec-frontend/docker-compose.prod.yaml"

# 이미 cert 존재하면 스킵
if $COMPOSE run --rm --entrypoint sh certbot -c \
   '[ -f /etc/letsencrypt/live/'"$DOMAIN"'/fullchain.pem ]'; then
   echo "✅ cert already present – skip"; exit 0
fi

# 1) webroot 방식으로 **비대화형** 최초 발급
$COMPOSE run --rm --entrypoint certbot certbot certonly \
      --non‑interactive --keep-until-expiring --agree-tos \
      $EMAIL_OPT -w /var/www/certbot -d "$DOMAIN"

# 2) 누락된 recommend‑config 파일 복사
$COMPOSE run --rm --entrypoint sh certbot -c "
  cp /usr/share/certbot/options-ssl-nginx.conf      /etc/letsencrypt/ 2>/dev/null || true
  cp /usr/share/certbot/ssl-dhparams.pem            /etc/letsencrypt/ 2>/dev/null || true
"

echo "🎉  New certificate + recommend‑config generated"
