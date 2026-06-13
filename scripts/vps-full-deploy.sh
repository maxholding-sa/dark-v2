#!/usr/bin/env bash
# One command from your Mac: push .env + deploy on VPS.
set -euo pipefail

VPS_HOST="${VPS_HOST:-72.62.30.173}"
VPS_USER="${VPS_USER:-root}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 1/2 Upload .env to VPS"
bash scripts/push-env-to-vps.sh

echo ""
echo "==> 2/2 Deploy on VPS (build + PM2 restart)"
ssh "${VPS_USER}@${VPS_HOST}" 'bash ~/dark-v2/scripts/vps-deploy.sh'

echo ""
echo "Check: https://maxmotors.sa/api/cars?page=1&limit=2"
