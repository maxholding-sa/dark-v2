import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "../src/generated/prisma/index.js";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getDirectDatabaseUrl() {
  if (process.env.DIRECT_URL && !process.env.DIRECT_URL.includes("pooler")) {
    return process.env.DIRECT_URL;
  }

  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([a-z0-9]+)\.supabase\.co/i
  )?.[1];
  const password = process.env.DATABASE_URL?.match(/postgresql:\/\/[^:]+:([^@]+)@/i)?.[1];

  if (!supabaseRef || !password) {
    throw new Error(
      "Set DIRECT_URL to the Supabase direct connection (db.<ref>.supabase.co:5432), or ensure DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL are set."
    );
  }

  return `postgresql://postgres:${password}@db.${supabaseRef}.supabase.co:5432/postgres?sslmode=require`;
}

loadEnvFile();

const db = new PrismaClient({
  datasources: { db: { url: getDirectDatabaseUrl() } },
});

try {
  await db.$executeRawUnsafe(`
    ALTER TABLE "LoanRequest"
    ADD COLUMN IF NOT EXISTS "birthDateType" TEXT NOT NULL DEFAULT 'hijri';
  `);
  console.log("LoanRequest.birthDateType column is ready.");
} finally {
  await db.$disconnect();
}
