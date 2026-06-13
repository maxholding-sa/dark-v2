#!/usr/bin/env node
/**
 * Checks whether the mobile app can load cars (Supabase + local API).
 * Run: node scripts/check-mobile-connection.cjs
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
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
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    ).ref;
  } catch {
    return null;
  }
}

async function main() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const api = (env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3001").replace(
    "localhost",
    "127.0.0.1"
  );

  console.log("Mobile connection check\n");

  const urlRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const anonRef = jwtRef(anon || "");
  if (urlRef && anonRef && urlRef !== anonRef) {
    console.log("❌ Supabase URL and anon key are from different projects.");
    console.log(`   URL: ${urlRef}, anon: ${anonRef}`);
  } else {
    console.log("✅ Supabase URL and anon key match:", urlRef || "?");
  }

  if (url && anon) {
    try {
      const res = await fetch(
        `${url}/rest/v1/Car?status=eq.AVAILABLE&select=id,make,model&limit=2`,
        {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        }
      );
      const body = await res.text();
      if (res.ok) {
        console.log("✅ Supabase Car read OK:", body.slice(0, 200));
      } else if (body.includes("permission denied for schema public")) {
        console.log("❌ Supabase schema blocked — run scripts/supabase-enable-anon-read.sql");
        console.log("   in Supabase Dashboard → SQL Editor");
      } else {
        console.log("❌ Supabase Car read failed:", res.status, body.slice(0, 200));
      }
    } catch (e) {
      console.log("❌ Supabase unreachable:", e.message);
    }
  }

  try {
    const res = await fetch(`${api}/api/cars?page=1&limit=2`, {
      headers: { Accept: "application/json" },
    });
    const body = await res.text();
    if (res.ok && body.includes('"success":true')) {
      console.log("✅ Local API /api/cars OK");
    } else {
      console.log("❌ Local API /api/cars failed:", res.status);
      if (body.includes("tenant/user")) {
        console.log("   Fix DATABASE_URL in .env from Supabase → Settings → Database");
      }
    }
  } catch (e) {
    console.log("❌ Local API unreachable — run: npm run dev -- -p 3001");
  }

  const ok =
    (await (async () => {
      if (!url || !anon) return false;
      try {
        const res = await fetch(
          `${url}/rest/v1/Car?status=eq.AVAILABLE&select=id&limit=1`,
          { headers: { apikey: anon, Authorization: `Bearer ${anon}` } }
        );
        return res.ok;
      } catch {
        return false;
      }
    })()) &&
    (await (async () => {
      try {
        const res = await fetch(`${api}/api/cars?page=1&limit=1`, {
          headers: { Accept: "application/json" },
        });
        const body = await res.text();
        return res.ok && body.includes('"success":true');
      } catch {
        return false;
      }
    })());

  if (ok) {
    console.log("\n✅ All checks passed — use --dart-define=USE_DEMO_DATA=false");
  } else {
    console.log("\nFlutter: cd max_motors_app && ./scripts/run_with_web_env.sh chrome");
  }
}

main();
