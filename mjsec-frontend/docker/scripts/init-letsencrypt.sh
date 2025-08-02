DOMAIN="mjsec.kr"
EMAIL="admin@example.com"   # 옵션. 없으면 --register-unsafely-without-email 사용

docker compose -f docker-compose.prod.yaml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --agree-tos --no-eff-email \
  --domain "${DOMAIN}" --email "${EMAIL}"
