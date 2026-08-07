// To communicate with the db, need to create a prisma instance

import { PrismaClient } from "@/generated/prisma";

const prismaClientOptions = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
};

const getDbProjectRef = (url = "") => {
  const pooler = url.match(/postgres\.([a-z0-9]+):/i);
  if (pooler?.[1]) return pooler[1];
  const direct = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  if (direct?.[1]) return direct[1];
  return null;
};

const getSupabaseProjectRef = () => {
  const match = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(
    /https:\/\/([a-z0-9]+)\.supabase\.co/i
  );
  return match?.[1] || null;
};

const warnIfDatabaseProjectMismatch = () => {
  const dbRef = getDbProjectRef(process.env.DATABASE_URL || "");
  const supabaseRef = getSupabaseProjectRef();
  if (!dbRef || !supabaseRef || dbRef === supabaseRef) return;

  console.warn(
    `[prisma] DATABASE_URL project (${dbRef}) does not match NEXT_PUBLIC_SUPABASE_URL (${supabaseRef}). ` +
      "Update DATABASE_URL in .env.local from Supabase → Settings → Database, then restart the dev server."
  );
};

const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL || "";

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // If using Supabase pooler (port 6543), ensure pgbouncer=true is present
  if (url.includes(":6543") && !url.includes("pgbouncer=true")) {
    url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }

  if (!url.includes("sslmode=")) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }

  // Dev needs a small pool for parallel layout queries; keep below Supabase free-tier limits
  const limit = process.env.NODE_ENV === "development" ? 5 : 10;
  const timeout = 20;

  if (!url.includes("connection_limit=")) {
    url += (url.includes("?") ? "&" : "?") + `connection_limit=${limit}`;
  }

  if (!url.includes("pool_timeout=")) {
    url += (url.includes("?") ? "&" : "?") + `pool_timeout=${timeout}`;
  }

  if (!url.includes("connect_timeout=")) {
    url += (url.includes("?") ? "&" : "?") + "connect_timeout=10";
  }

  return url;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True when Supabase is paused, pooler is cold, or the network dropped briefly. */
export function isDbConnectionError(error) {
  const code = error?.code;
  const message = error?.message || String(error || "");
  const cause = error?.cause ? String(error.cause) : "";
  const haystack = `${message}\n${cause}`;

  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    /can't reach database server/i.test(haystack) ||
    /connection (terminated|closed|reset|refused|timed out)/i.test(haystack) ||
    /server has closed the connection/i.test(haystack) ||
    /kind:\s*Closed/i.test(haystack) ||
    /broken pipe/i.test(haystack) ||
    /socket hang up/i.test(haystack) ||
    /Timed out fetching a new connection/i.test(haystack)
  );
}

async function softReconnect(base) {
  try {
    await base.$disconnect();
  } catch {
    // ignore
  }
  try {
    await base.$connect();
  } catch {
    // next query attempt will surface the error if still broken
  }
}

function createPrismaClient() {
  warnIfDatabaseProjectMismatch();
  const base = new PrismaClient({
    ...prismaClientOptions,
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

  globalForPrisma.prismaBase = base;

  // Auto-retry transient pooler drops on every query so callers don't each need withDbRetry.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isDbConnectionError(error) || attempt === 3) {
              throw error;
            }
            await softReconnect(base);
            await sleep(400 * attempt);
          }
        }

        throw lastError;
      },
    },
  });
}

// Bump when Prisma schema changes so HMR does not keep an outdated client.
const PRISMA_CLIENT_VERSION = "20260807-conn-retry";
const globalForPrisma = globalThis;

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION
  ) {
    void globalForPrisma.prismaBase?.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaBase = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  }

  return globalForPrisma.prisma;
}

/** Retry transient Supabase/pooler failures (common after project wake or HMR). */
export async function withDbRetry(operation, { retries = 3, delayMs = 500 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDbConnectionError(error) || attempt === retries) {
        throw error;
      }

      const base = globalForPrisma.prismaBase;
      if (base) {
        await softReconnect(base);
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

export const db = getPrismaClient();

// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
