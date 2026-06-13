#!/usr/bin/env bash
# Runs Flutter using dark-v2/.env (same as the Next.js web app).
# Usage: ./scripts/run_with_web_env.sh [device] [extra flutter args...]
# Example: ./scripts/run_with_web_env.sh chrome
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
FLUTTER="$ROOT_DIR/.flutter-sdk/bin/flutter"
CHECK="$ROOT_DIR/scripts/check-mobile-connection.cjs"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

API_BASE="${NEXT_PUBLIC_BASE_URL:-http://127.0.0.1:3001}"
API_BASE="${API_BASE/localhost/127.0.0.1}"

DEVICE="${1:-chrome}"
shift || true

DEFINES=(
  "--dart-define=API_BASE_URL=${API_BASE}"
  "--dart-define=SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-}"
  "--dart-define=SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
  "--dart-define=CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
)

USE_DEMO="false"
if [[ "$*" == *"USE_DEMO_DATA=true"* ]]; then
  USE_DEMO="true"
elif [[ "$*" == *"USE_DEMO_DATA=false"* ]]; then
  USE_DEMO="false"
elif [[ -n "${USE_DEMO_DATA:-}" ]]; then
  USE_DEMO="${USE_DEMO_DATA}"
fi

echo "Using web .env: $ENV_FILE"
echo "  API_BASE_URL=$API_BASE"
echo "  SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-<empty>}"
echo ""

BACKEND_OK="false"
if [[ -f "$CHECK" ]]; then
  CHECK_OUT="$(node "$CHECK" 2>&1 || true)"
  echo "$CHECK_OUT"
  echo ""
  if echo "$CHECK_OUT" | grep -q "✅ Supabase Car read OK"; then
    BACKEND_OK="true"
  fi
fi

if [[ "$BACKEND_OK" != "true" && "$USE_DEMO" != "true" ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  Backend not ready — using DEMO cars until you fix:"
  echo "   1) Run scripts/supabase-enable-anon-read.sql in Supabase SQL Editor"
  echo "   2) Update DATABASE_URL + DIRECT_URL in .env (jbpsuxpvazcchafiqnrf)"
  echo "   3) Restart: npm run dev -- -p 3001"
  echo "   Then run with: --dart-define=USE_DEMO_DATA=false"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  USE_DEMO="true"
fi

DEFINES+=("--dart-define=USE_DEMO_DATA=${USE_DEMO}")

cd "$APP_DIR"
exec "$FLUTTER" run -d "$DEVICE" "${DEFINES[@]}" "$@"
