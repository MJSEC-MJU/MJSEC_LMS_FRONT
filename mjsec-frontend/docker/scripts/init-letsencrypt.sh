#!/usr/bin/env bash
# ------------------------------------------------------------------
#  Let’s Encrypt 1‑shot (webroot) bootstrap 스크립트
#  - 실행 전 .env(ORG/REPO/DOMAIN/EMAIL) 로드
#  - 이미 인증서가 있으면 아무 것도 하지 않음
# ------------------------------------------------------------------
set -euo pipefail

# 0) .env 로드 ────────────────────────────────────────────────────
if [[ -f .env ]]; then
  set -a                # export 자동
  . ./.env
  set +a
fi

DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${EMAIL:-}}"
[[ -z "${DOMAIN}" ]] && { echo "❌ DOMAIN 변수가 없습니다"; exit 1; }

# 1) 공통 옵션 구성 ──────────────────────────────────────────────
EMAIL_OPT="--register-unsafely-without-email --no-eff-email"
[[ -n "${EMAIL:-}" ]] && EMAIL_OPT="--email ${EMAIL} --no-eff-email"

echo "▶︎ DOMAIN = ${DOMAIN}"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

COMPOSE="docker compose --env-file .env -f mjsec-frontend/docker-compose.prod.yaml"

# 2) 기존 인증서 존재하면 종료 ──────────────────────────────────
if $COMPOSE run --rm --entrypoint sh certbot -c \
   "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]"; then
  echo "✅ 인증서가 이미 존재합니다. 스킵."
  exit 0
fi

# 3) 최초 발급 (비대화형) ─────────────────────────────────────────
$COMPOSE run --rm \
  --entrypoint certbot certbot \
  certonly --non-interactive --keep-until-expiring \
  --agree-tos $EMAIL_OPT \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}"

# 4) 권장 SSL 설정 파일이 없으면 복사 ────────────────────────────
$COMPOSE run --rm --entrypoint sh certbot -c "
  for f in options-ssl-nginx.conf ssl-dhparams.pem; do
    src=\"/usr/share/certbot/\$f\"; dst=\"/etc/letsencrypt/\$f\"
    [ -f \"\$dst\" ] || { cp \"\$src\" \"\$dst\" 2>/dev/null || true; }
  done
"

echo "🎉  New certificate issued & recommended config prepared"
