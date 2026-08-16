import "server-only";

import { PrismaClient } from "@prisma/client";
import { serverEnv, isDevelopment } from "@/config/env";
import { logger } from "@/lib/logger";

/**
 * The single database client.
 *
 * Only `src/server/**` may import this — the ESLint `no-restricted-imports`
 * rule enforces it, and `server-only` makes an accidental client import a build
 * error rather than a leaked connection string.
 */

/**
 * Supabase's pooler needs `pgbouncer=true` and rejects unencrypted connections.
 * Appending here rather than asking every developer to remember it in `.env`.
 */
function buildConnectionUrl(raw: string): string {
  const url = new URL(raw);

  if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  if (!url.searchParams.has("connection_limit")) {
    // Dev opens many short-lived connections through HMR; keep well under the
    // Supabase free-tier ceiling so the pool never starves a page render.
    url.searchParams.set("connection_limit", isDevelopment ? "5" : "20");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "30");
  }

  return url.toString();
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
    datasources: { db: { url: buildConnectionUrl(serverEnv().DATABASE_URL) } },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (isDevelopment) globalForPrisma.prisma = prisma;

/**
 * True for the failures that resolve on their own: a paused Supabase project
 * waking up, a cold pooler, a dropped socket. Anything else is a real bug and
 * must not be retried.
 */
export function isTransientDbError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === "P1001" || code === "P1017") return true;

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries transient connection failures with linear backoff. */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { retries = 3, delayMs = 500 }: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === retries) throw error;

      logger.warn("db.retry", { attempt, retries });
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}
