import "server-only";

import { AppError } from "@/server/errors/app-error";
import { logger } from "@/lib/logger";

/**
 * In-process rate limiting for the handful of endpoints an anonymous visitor
 * can write to (contact form, test-drive booking, loan request, chat).
 *
 * Deliberately simple: a fixed window in a `Map`. That is enough to stop a
 * script hammering the contact form from one machine, which is the actual
 * threat here. It does **not** survive a restart and is **per instance** — if
 * this deploys behind more than one node, move the counter to Redis or Upstash
 * and keep this signature.
 *
 * v1 had Arcjet installed for this, configured on one route.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Drops expired entries so the map cannot grow without bound. */
function sweep(now: number): void {
  if (windows.size < 5000) return;

  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitOptions {
  /** Distinct bucket, e.g. `"contact"`. Keeps unrelated endpoints independent. */
  name: string;
  limit: number;
  windowMs: number;
}

/**
 * Throws RATE_LIMITED once `limit` calls have been made from `identifier`
 * within the window.
 */
export function enforceRateLimit(identifier: string, options: RateLimitOptions): void {
  const now = Date.now();
  sweep(now);

  const key = `${options.name}:${identifier}`;
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    logger.warn("rateLimit.exceeded", { name: options.name, identifier });
    throw new AppError("RATE_LIMITED", `Rate limit exceeded for ${options.name}`, {
      messageKey: "errors.rate_limited",
    });
  }
}

/** Test seam — resets all buckets. */
export function resetRateLimits(): void {
  windows.clear();
}
