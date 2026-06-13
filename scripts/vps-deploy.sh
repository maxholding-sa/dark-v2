#!/usr/bin/env bash
# Pull latest code, build, and reload PM2. Run on the VPS (manually or via GitHub Actions).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/dark-v2}"
BRANCH="${DEPLOY_BRANCH:-master}"
PM2_APP="${PM2_APP:-max-motors}"

cd "$APP_DIR"

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm ci

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
