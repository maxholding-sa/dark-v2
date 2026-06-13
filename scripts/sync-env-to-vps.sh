#!/usr/bin/env bash
# Copy local .env to VPS and set production URLs. Run from your Mac in the repo root.
set -euo pipefail

VPS_HOST="${VPS_HOST:-72.62.30.173}"
VPS_USER="${VPS_USER:-root}"
VPS_APP_DIR="${VPS_APP_DIR:-~/dark-v2}"
DOMAIN="${DOMAIN:-maxmotors.sa}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — create it from env.example first."
  exit 1
fi

if grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY=.* ' "$ENV_FILE"; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY contains a space in $ENV_FILE"
  exit 1
fi

REMOTE_DIR="${VPS_APP_DIR/#\~/$VPS_USER@$VPS_HOST:~/}"
# shellcheck disable=SC2086
scp "$ENV_FILE" "${VPS_USER}@${VPS_HOST}:dark-v2/.env"

ssh "${VPS_USER}@${VPS_HOST}" bash -s <<EOF
set -euo pipefail
ENV_FILE="\${HOME}/dark-v2/.env"
for key in NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_BASE_URL; do
  if grep -q "^\${key}=" "\$ENV_FILE"; then
    sed -i "s|^\${key}=.*|\${key}=https://${DOMAIN}|" "\$ENV_FILE"
  else
    echo "\${key}=https://${DOMAIN}" >> "\$ENV_FILE"
  fi
done
echo "Updated production URLs on VPS:"
grep -E '^(NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_BASE_URL|NEXT_PUBLIC_SUPABASE_URL)=' "\$ENV_FILE"
EOF

echo ""
echo "Done. Deploy on VPS:"
echo "  ssh ${VPS_USER}@${VPS_HOST} 'bash ~/dark-v2/scripts/vps-deploy.sh'"
