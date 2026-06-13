#!/usr/bin/env bash
# Pull latest code, build, and reload PM2. Run ON THE VPS (not your Mac).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/dark-v2}"
BRANCH="${DEPLOY_BRANCH:-master}"
PM2_APP="${PM2_APP:-max-motors}"

if [[ "$(uname -s)" == "Darwin" && "${FORCE_VPS_DEPLOY:-}" != "1" ]]; then
  echo "ERROR: Run this on the VPS, not your Mac."
  echo "  ssh root@72.62.30.173 'bash ~/dark-v2/scripts/vps-deploy.sh'"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

cd "$APP_DIR"

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
if ! npm ci; then
  echo "npm ci failed (lock file drift) — falling back to npm install"
  npm install
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "ERROR: Missing $APP_DIR/.env"
  echo "Copy your local .env to the VPS, then run deploy again."
  exit 1
fi

echo "==> Checking Supabase / database connectivity"
if ! node scripts/vps-check-data.cjs; then
  echo ""
  echo "Deploy stopped: fix .env on the VPS first (see errors above)."
  exit 1
fi

echo "==> Building Next.js app"
npm run build

echo "==> Reloading PM2 ($PM2_APP)"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "==> Deploy complete"
pm2 status "$PM2_APP"
