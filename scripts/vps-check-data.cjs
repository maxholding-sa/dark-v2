#!/usr/bin/env node
/**
 * Diagnose why Supabase/DB data is missing on VPS.
 * Run on the VPS: node scripts/vps-check-data.cjs
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ No .env file at", envPath);
  console.error("   Copy your working local .env to the VPS, then rebuild.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

function jwtRef(token) {
  try {
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    ).ref;
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

function dbRef(url) {
  const m = url?.match(/postgres(?:\.([a-z0-9]+))?@/i);
  if (m?.[1]) return m[1];
  const m2 = url?.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  return m2?.[1] || null;
}

let failed = false;
let supabaseOk = false;
let prismaOk = false;

console.log("VPS data connection check\n");

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
for (const key of required) {
  if (!env[key]) {
    console.log(`❌ Missing ${key}`);
    failed = true;
  }
}

const urlRef = hostRef(env.NEXT_PUBLIC_SUPABASE_URL || "");
const anonRef = jwtRef(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const dbProjectRef = dbRef(env.DATABASE_URL || "");

if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes(" ")) {
  console.log("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY contains a space (invalid JWT)");
  console.log("   Your VPS .env was likely copied from env.example — copy from local .env");
  failed = true;
}

if (urlRef && anonRef && urlRef !== anonRef) {
  console.log(`❌ Supabase URL project (${urlRef}) != anon key project (${anonRef})`);
  failed = true;
} else if (urlRef && anonRef) {
  console.log(`✅ Supabase URL + anon key match project: ${urlRef}`);
}

if (dbProjectRef && urlRef && dbProjectRef !== urlRef) {
  console.log(
    `❌ DATABASE_URL project (${dbProjectRef}) != Supabase URL (${urlRef})`
  );
  console.log(
    "   Prisma will fail. In Supabase → jbpsuxpvazcchafiqnrf → Settings → Database,"
  );
  console.log("   copy the pooler URL (port 6543) into DATABASE_URL on the VPS.");
  failed = true;
}

async function testSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return;

  try {
    const res = await fetch(
      `${url}/rest/v1/Car?status=eq.AVAILABLE&select=id&limit=1`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` } }
    );
    const body = await res.text();
    if (res.ok) {
      const rows = JSON.parse(body);
      console.log(`✅ Supabase REST read OK (${rows.length} sample row(s))`);
      supabaseOk = true;
      return;
    }
    if (body.includes("permission denied for schema public")) {
      console.log("❌ Supabase blocked anon reads");
      console.log("   Run scripts/supabase-enable-anon-read.sql in Supabase SQL Editor");
    } else {
      console.log("❌ Supabase REST failed:", res.status, body.slice(0, 180));
    }
    failed = true;
  } catch (e) {
    console.log("❌ Supabase unreachable:", e.message);
    failed = true;
  }
}

async function testDatabase() {
  if (!env.DATABASE_URL) return;

  try {
    const { PrismaClient } = require("../src/generated/prisma");
    const prisma = new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL } },
    });
    const count = await prisma.car.count({ where: { status: "AVAILABLE" } });
    await prisma.$disconnect();
    console.log(`✅ Prisma/DATABASE_URL OK (${count} AVAILABLE cars)`);
    prismaOk = true;
  } catch (e) {
    const msg = e?.message || String(e);
    console.log("❌ Prisma/DATABASE_URL failed:", msg.split("\n")[0].slice(0, 220));
    if (msg.includes("Tenant or user not found") || msg.includes("password authentication failed")) {
      console.log("   Fix DATABASE_URL from Supabase → Settings → Database → Connection string");
    }
    failed = true;
  }
}

(async () => {
  await testSupabase();
  await testDatabase();

  console.log("");
  if (!supabaseOk && !prismaOk) {
    console.log("❌ Neither Supabase nor DATABASE_URL can load car data.");
    console.log("Fix .env on the VPS, then rebuild:");
    console.log("  nano ~/dark-v2/.env");
    console.log("  bash ~/dark-v2/scripts/vps-deploy.sh");
    console.log("");
    console.log("Copy local .env securely:");
    console.log("  scp .env root@72.62.30.173:~/dark-v2/.env");
    process.exit(1);
  }

  if (!prismaOk) {
    console.log("⚠️  DATABASE_URL failed but Supabase works — site can still load data.");
    console.log("   Update DATABASE_URL from Supabase → Settings → Database for faster queries.");
  }
  if (!supabaseOk && prismaOk) {
    console.log("⚠️  Supabase anon read failed but Prisma works.");
    console.log("   Run scripts/supabase-enable-anon-read.sql if you need Supabase fallback.");
  }

  console.log("✅ At least one data source is working.");
  console.log("If the site still shows empty data, rebuild to refresh Next.js cache:");
  console.log("  bash ~/dark-v2/scripts/vps-deploy.sh");
})();
