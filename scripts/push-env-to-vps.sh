#!/usr/bin/env bash
# Builds a production .env from your local .env and uploads it to the VPS.
# Run on your Mac from the repo root:
#   bash scripts/push-env-to-vps.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-72.62.30.173}"
VPS_USER="${VPS_USER:-root}"
DOMAIN="${DOMAIN:-maxmotors.sa}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT_DIR/.env"
DEST="$(mktemp)"

cleanup() { rm -f "$DEST"; }
trap cleanup EXIT

if [[ ! -f "$SOURCE" ]]; then
  echo "❌ Missing $SOURCE"
  exit 1
fi

python3 - "$SOURCE" "$DEST" "$DOMAIN" <<'PY'
import sys
from pathlib import Path

source, dest, domain = sys.argv[1:4]
lines = Path(source).read_text().splitlines()
out = {}
order = []

for line in lines:
    if not line or line.lstrip().startswith("#"):
        continue
    if "=" not in line:
        continue
    key, _, value = line.partition("=")
    key = key.strip()
    value = value.strip()
    if key in ("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        value = value.replace(" ", "").replace("\t", "")
    if key not in out:
        order.append(key)
    out[key] = value

out["NEXT_PUBLIC_SITE_URL"] = f"https://{domain}"
out["NEXT_PUBLIC_BASE_URL"] = f"https://{domain}"
out["NODE_ENV"] = "production"

def host_ref(url):
    try:
        host = url.split("https://", 1)[1].split(".supabase.co")[0]
        return host
    except Exception:
        return None

def db_ref(url):
    import re
    m = re.search(r"postgres(?:\.([a-z0-9]+))?", url or "")
    if m and m.group(1):
        return m.group(1)
    m2 = re.search(r"db\.([a-z0-9]+)\.supabase\.co", url or "")
    return m2.group(1) if m2 else None

url_ref = host_ref(out.get("NEXT_PUBLIC_SUPABASE_URL", ""))
db_project = db_ref(out.get("DATABASE_URL", ""))
if url_ref and db_project and url_ref != db_project:
    print(f"ERROR: DATABASE_URL uses project {db_project} but Supabase URL uses {url_ref}.")
    print("Run: bash scripts/set-database-url.sh")
    sys.exit(1)

Path(dest).write_text("\n".join(f"{k}={out[k]}" for k in order if k in out) + "\n")
PY

echo "Will upload these (secrets hidden):"
grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SITE_URL)=' "$DEST" || true

if grep -E 'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*[[:space:]]' "$DEST"; then
  echo "❌ Anon key still has spaces. Fix $SOURCE first."
  exit 1
fi

echo ""
echo "Uploading to ${VPS_USER}@${VPS_HOST}:~/dark-v2/.env ..."
scp "$DEST" "${VPS_USER}@${VPS_HOST}:~/dark-v2/.env"

echo ""
echo "Verifying on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" 'cd ~/dark-v2 && node scripts/vps-check-data.cjs'

echo ""
echo "✅ Done. Deploy:"
echo "   ssh ${VPS_USER}@${VPS_HOST} 'bash ~/dark-v2/scripts/vps-deploy.sh'"
