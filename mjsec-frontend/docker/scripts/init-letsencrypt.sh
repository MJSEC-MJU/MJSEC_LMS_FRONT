set -euo pipefail

# 0) .env 가 있으면 읽어 들이기
if [[ -f .env ]]; then
  set -o allexport
  source .env
  set +o allexport
fi

# 1) 변수 확보 (우선순위: 인자 > ENV > .env)
DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${EMAIL:-}}"

if [[ -z "${DOMAIN}" ]]; then
  echo "DOMAIN 변수가 없습니다 (.env 또는 인자로 전달하세요)"
  exit 1
fi

# 2) certbot 옵션 구성
EMAIL_OPT="--no-eff-email"
if [[ -z "${EMAIL}" ]]; then
  echo "EMAIL 이 없어 --register-unsafely-without-email 로 진행합니다"
  EMAIL_OPT="--register-unsafely-without-email"
else
  EMAIL_OPT="--email ${EMAIL} --no-eff-email"
fi

echo "▶︎ DOMAIN = ${DOMAIN}"
echo "▶︎ EMAIL  = ${EMAIL:-<none>}"

# 3) 실제 certbot 실행
docker compose -f mjsec-frontend/docker-compose.prod.yaml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --agree-tos ${EMAIL_OPT} \
  -d "${DOMAIN}"