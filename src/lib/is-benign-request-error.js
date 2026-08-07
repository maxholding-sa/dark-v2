/**
 * Client navigations / HMR / refreshes cancel in-flight RSC streams.
 * Next.js surfaces those as "Connection closed" / aborted / ECONNRESET —
 * noisy, not actionable app bugs.
 */
export function isBenignRequestError(error) {
  if (!error) return false;

  const code = String(error.code || error.cause?.code || "");
  const name = String(error.name || "");
  const message = String(error.message || error || "");

  if (code === "ECONNRESET" || code === "ECONNABORTED" || code === "ERR_CANCELED") {
    return true;
  }

  if (name === "AbortError") return true;

  return (
    /^aborted$/i.test(message) ||
    /connection closed/i.test(message) ||
    /socket hang up/i.test(message) ||
    /request aborted/i.test(message) ||
    /the operation was aborted/i.test(message)
  );
}
