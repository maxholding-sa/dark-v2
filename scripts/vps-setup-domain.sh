#!/usr/bin/env bash
# Point maxmotors.sa at the Next.js app (PM2 :3000) with HTTPS.
# Run ON THE VPS as root, after DNS A records point to this server.
#
# Prerequisites:
#   - maxmotors.sa  A  -> 72.62.30.173
#   - www.maxmotors.sa A -> 72.62.30.173  (optional)
#   - PM2 app running: pm2 status max-motors
set -euo pipefail

DOMAIN="${DOMAIN:-maxmotors.sa}"
APP_DIR="${APP_DIR:-$HOME/dark-v2}"
EMAIL="${CERTBOT_EMAIL:-admin@maxmotors.sa}"

echo "==> Installing nginx and certbot"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "==> Installing nginx site config for $DOMAIN"
cp "$APP_DIR/scripts/nginx-maxmotors.conf" /etc/nginx/sites-available/maxmotors
ln -sf /etc/nginx/sites-available/maxmotors /etc/nginx/sites-enabled/maxmotors
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> Requesting SSL certificate"
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect

echo "==> Updating .env site URL"
ENV_FILE="$APP_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE"; then
    sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://maxmotors.sa|' "$ENV_FILE"
  else
    echo 'NEXT_PUBLIC_SITE_URL=https://maxmotors.sa' >> "$ENV_FILE"
  fi
fi

echo "==> Rebuilding and reloading app (picks up NEXT_PUBLIC_SITE_URL)"
cd "$APP_DIR"
bash scripts/vps-deploy.sh

echo ""
echo "Done. Site should be live at https://$DOMAIN"
echo ""
echo "Also configure in Clerk dashboard:"
echo "  - Add domain: https://maxmotors.sa"
echo "  - Add redirect URLs for sign-in / sign-up if needed"
