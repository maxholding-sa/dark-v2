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
    /Timed out fetching a new connection/i.test(haystack) ||
    isEngineNotConnectedError(error)
  );
}

/**
 * The engine process is alive but has no live connection yet. Seen on cold
 * start and after HMR, when the root layout's parallel queries reach the client
 * before the handshake finishes — and whenever a reconnect tears the shared
 * engine down while sibling queries are still in flight.
 */
export function isEngineNotConnectedError(error) {
  const haystack = `${error?.message || String(error || "")}\n${
    error?.cause ? String(error.cause) : ""
  }`;

  return (
    /engine is not yet connected/i.test(haystack) ||
    /engine is not running/i.test(haystack) ||
    /response from the engine was empty/i.test(haystack)
  );
}

// A request fans out into several parallel queries (the root layout alone fires
// five). Without this, each failing query would start its own disconnect and
// knock over its siblings, so all recovery is funnelled through one promise.
let recoveryPromise = null;
let lastRecoveryAt = 0;
const RECOVERY_COOLDOWN_MS = 2000;

function runRecovery(task) {
  if (recoveryPromise) return recoveryPromise;

  recoveryPromise = task()
    .catch((error) => {
      // Keep the rejection for awaiters, but clear the slot so a later burst
      // can try again instead of latching onto a dead promise forever.
      throw error;
    })
    .finally(() => {
      lastRecoveryAt = Date.now();
      recoveryPromise = null;
    });

  return recoveryPromise;
}

/** Wait until this client has a live engine (safe to call when already connected). */
async function ensureConnected(base) {
  await base.$connect();
}

/** Tear down the stuck engine and build a fresh client (must run inside runRecovery). */
async function recreatePrismaClient() {
  try {
    await globalForPrisma.prismaBase?.$disconnect();
  } catch {
    // ignore
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaBase = undefined;
  globalForPrisma.prisma = createPrismaClient();
  await ensureConnected(globalForPrisma.prismaBase);
}

/**
 * Re-establish the connection. Prefer $connect()-only for half-ready engines;
 * fall back to a disconnect cycle for dead pooler sockets; recreate the client
 * when the engine is stuck after HMR.
 */
async function softReconnect(base, error, { allowHardReset = false } = {}) {
  if (isEngineNotConnectedError(error)) {
    return runRecovery(async () => {
      try {
        await ensureConnected(base);
      } catch (connectError) {
        if (!allowHardReset) throw connectError;
        // Recreate inline — nested runRecovery would deadlock on recoveryPromise.
        await recreatePrismaClient();
      }
    });
  }

  if (Date.now() - lastRecoveryAt < RECOVERY_COOLDOWN_MS) {
    if (recoveryPromise) {
      try {
        await recoveryPromise;
      } catch {
        // next query attempt will surface the error if still broken
      }
    }
    return;
  }

  return runRecovery(async () => {
    try {
      await base.$disconnect();
    } catch {
      // ignore — reconnecting is what matters
    }
    await ensureConnected(base);
  });
}

async function runOnCurrentClient(model, operation, args) {
  const client = getPrismaClient();
  if (model) {
    return client[model][operation](args);
  }
  return client[operation](args);
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

  // Kick off the handshake immediately. Queries also await $connect() so a
  // failed/slow first attempt is not swallowed into a parallel race.
  const ready = ensureConnected(base);

  // Auto-retry transient pooler drops on every query so callers don't each need withDbRetry.
  return base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          await ready;
        } catch {
          // Initial connect may still be waking Supabase; ensureConnected below retries.
        }
        await ensureConnected(base);

        let lastError;
        const maxAttempts = 5;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isDbConnectionError(error) || attempt === maxAttempts) {
              throw error;
            }

            const allowHardReset =
              isEngineNotConnectedError(error) && attempt >= 3;

            try {
              await softReconnect(base, error, { allowHardReset });
            } catch {
              // Retry the query anyway — softReconnect already did its best.
            }

            // After a hard reset the closed-over `query` is dead; re-dispatch
            // through the fresh singleton (re-enters this extension once).
            if (allowHardReset && globalForPrisma.prismaBase !== base) {
              return runOnCurrentClient(model, operation, args);
            }

            await sleep(500 * attempt);
          }
        }

        throw lastError;
      },
    },
  });
}

// Bump when Prisma client wiring changes so HMR does not keep a stuck engine.
const PRISMA_CLIENT_VERSION = "20260914-engine-ready";
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
        try {
          await softReconnect(base, error, {
            allowHardReset: isEngineNotConnectedError(error) && attempt >= 2,
          });
        } catch {
          // next attempt will surface the error if still broken
        }
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

// Proxy so hard resets / HMR always resolve to the current client instance.
export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return undefined;
      }
      const client = getPrismaClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
