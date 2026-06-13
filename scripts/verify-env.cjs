#!/usr/bin/env node
/**
 * Checks that Supabase URL, anon key, and service_role key all reference
 * the same project ref. Run: node scripts/verify-env.js
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.error("No .env file found.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

function jwtRef(token) {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString());
    return json.ref || null;
  } catch {
    return null;
  }
}

function hostRef(url) {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".supabase.co")) return host.split(".")[0];
    return host;
  } catch {
    return null;
  }
}

const urlRef = hostRef(env.NEXT_PUBLIC_SUPABASE_URL || "");
const anonRef = jwtRef(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const serviceRef = jwtRef(env.SUPABASE_SERVICE_ROLE_KEY || "");

console.log("Supabase project refs:");
console.log("  URL host ref:     ", urlRef || "(missing)");
console.log("  anon key ref:     ", anonRef || "(missing)");
console.log("  service_role ref: ", serviceRef || "(missing)");

(async function main() {
  const refs = [urlRef, anonRef, serviceRef].filter(Boolean);
  const unique = [...new Set(refs)];
  if (unique.length > 1) {
    console.error("\n❌ MISMATCH: keys/URL are from different Supabase projects.");
    console.error(
      "   Open Supabase → Settings → API and copy URL + anon + database URLs",
      "from ONE project (likely", serviceRef || "jbpsuxpvazcchafiqnrf", ")."
    );
    process.exit(1);
  }

  if (urlRef) {
    try {
      await dns.lookup(`${urlRef}.supabase.co`);
      console.log(`\n✅ DNS OK for ${urlRef}.supabase.co`);
    } catch {
      console.error(`\n❌ DNS failed for ${urlRef}.supabase.co (project paused/deleted?)`);
      process.exit(1);
    }
  }

  console.log("\n✅ Supabase env refs are consistent.");
})();
