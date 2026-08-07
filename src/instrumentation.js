/**
 * Filter reporting for cancelled navigations / HMR aborts.
 * Does not register process-level exception handlers (those change Node's crash behavior).
 */
import { isBenignRequestError } from "@/lib/is-benign-request-error";

export function onRequestError(error) {
  if (isBenignRequestError(error)) return;
}
