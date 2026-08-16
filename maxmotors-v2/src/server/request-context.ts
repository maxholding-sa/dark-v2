import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client identity for rate limiting.
 *
 * Behind a proxy the socket address is the proxy's, so the forwarded headers
 * are the only signal available. They are spoofable by a direct caller, which
 * is why this is used only for throttling and never for authorisation.
 */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();

  // `x-forwarded-for` is a chain; the first entry is the original client.
  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || headerList.get("x-real-ip") || "unknown";
}
