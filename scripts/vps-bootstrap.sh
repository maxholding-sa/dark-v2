#!/usr/bin/env bash
# One-time VPS setup: Node.js, PM2, clone repo, env file, first deploy.
# Run ON THE VPS as the deploy user (e.g. root):
#   curl -fsSL https://raw.githubusercontent.com/maxholding-sa/dark-v2/master/scripts/vps-bootstrap.sh | bash
# Or after cloning:
#   bash scripts/vps-bootstrap.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/dark-v2}"
REPO_SSH="git@github.com:maxholding-sa/dark-v2.git"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates build-essential

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

echo "Node: $(node -v) | npm: $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
  pm2 startup systemd -u "$(whoami)" --hp "$HOME" || true
fi

if [[ ! -f "$HOME/.ssh/id_ed25519" ]]; then
  echo "==> Creating GitHub deploy SSH key"
  ssh-keygen -t ed25519 -C "hostinger-vps-$(hostname)" -f "$HOME/.ssh/id_ed25519" -N ""
  echo ""
  echo "Add this public key to GitHub → repo Settings → Deploy keys (read access):"
  echo "-------------------------------------------------------------------"
  cat "$HOME/.ssh/id_ed25519.pub"
  echo "-------------------------------------------------------------------"
  read -r -p "Press Enter after adding the deploy key on GitHub..."
fi

mkdir -p "$HOME/.ssh"
ssh-keyscan -t ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Cloning repository"
  git clone "$REPO_SSH" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "==> Creating .env from env.example"
  cp env.example .env
  echo ""
  echo "Edit $APP_DIR/.env with production values, then run:"
  echo "  bash scripts/vps-deploy.sh"
  exit 0
fi

bash scripts/vps-deploy.sh
