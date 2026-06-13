#!/usr/bin/env bash
# Set DATABASE_URL + DIRECT_URL to match your Supabase project ref.
# Get both strings from Supabase Dashboard → Settings → Database.
#
# Usage (on Mac or VPS):
#   bash scripts/set-database-url.sh
# Or paste URLs directly:
#   bash scripts/set-database-url.sh 'postgresql://postgres.REF:PASS@...6543/postgres?pgbouncer=true' 'postgresql://postgres:PASS@db.REF.supabase.co:5432/postgres'
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

SUPABASE_REF="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | sed 's|.*https://||;s|\.supabase.co.*||')"
if [[ -z "$SUPABASE_REF" ]]; then
  echo "Set NEXT_PUBLIC_SUPABASE_URL in .env first."
  exit 1
fi

if [[ $# -ge 2 ]]; then
  POOLER_URL="$1"
  DIRECT_URL="$2"
else
  echo "Supabase project: $SUPABASE_REF"
  echo ""
  echo "Open: https://supabase.com/dashboard/project/$SUPABASE_REF/settings/database"
  echo "Copy Transaction pooler (port 6543) and Direct (port 5432) connection strings."
  echo ""
  read -r -p "Paste DATABASE_URL (pooler, port 6543): " POOLER_URL
  read -r -p "Paste DIRECT_URL (direct, port 5432): " DIRECT_URL
fi

if [[ "$POOLER_URL" != *"$SUPABASE_REF"* ]]; then
  echo "ERROR: DATABASE_URL must contain project ref $SUPABASE_REF"
  exit 1
fi
if [[ "$DIRECT_URL" != *"$SUPABASE_REF"* ]]; then
  echo "ERROR: DIRECT_URL must contain project ref $SUPABASE_REF"
  exit 1
fi

python3 - "$ENV_FILE" "$POOLER_URL" "$DIRECT_URL" <<'PY'
import sys
from pathlib import Path

env_file, pooler, direct = sys.argv[1:4]
lines = Path(env_file).read_text().splitlines()
out = []
seen_db = seen_direct = False

for line in lines:
    if line.startswith("DATABASE_URL="):
        out.append(f"DATABASE_URL={pooler}")
        seen_db = True
    elif line.startswith("DIRECT_URL="):
        out.append(f"DIRECT_URL={direct}")
        seen_direct = True
    else:
        out.append(line)

if not seen_db:
    out.insert(0, f"DATABASE_URL={pooler}")
if not seen_direct:
    out.insert(1, f"DIRECT_URL={direct}")

Path(env_file).write_text("\n".join(out) + "\n")
print("Updated DATABASE_URL and DIRECT_URL in", env_file)
PY

echo ""
echo "Test locally:"
echo "  node scripts/vps-check-data.cjs"
echo ""
echo "Then push to VPS:"
echo "  bash scripts/push-env-to-vps.sh"
echo "  ssh root@72.62.30.173 'bash ~/dark-v2/scripts/vps-deploy.sh'"
