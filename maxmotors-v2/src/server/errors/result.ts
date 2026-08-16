import { AppError, isAppError, type ErrorCode, type FieldErrors } from "./app-error";
import { logger } from "@/lib/logger";

/**
 * The wire format every server action returns.
 *
 * Discriminated on `ok`, so `if (!result.ok)` narrows to the error branch and
 * TypeScript refuses to let a caller read `result.data` without checking. This
 * is what makes "forgot to handle the failure case" a compile error instead of
 * an undefined at runtime.
 */

export interface SerializedError {
  code: ErrorCode;
  /** Translation key — the UI decides the wording and the language. */
  messageKey: string;
  fieldErrors?: FieldErrors;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: SerializedError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(error: AppError): Result<never> {
  return {
    ok: false,
    error: {
      code: error.code,
      messageKey: error.messageKey,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };
}

/**
 * Wraps a server action body so thrown `AppError`s become typed failures and
 * anything unexpected becomes a generic INTERNAL — with the real cause logged
 * server-side. Stack traces and database messages never cross to the browser.
 */
export async function toResult<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    if (isAppError(error)) {
      // Expected, domain-level outcomes are not incidents — log at info.
      logger.info("action.rejected", { code: error.code, message: error.message });
      return fail(error);
    }

    logger.error("action.failed", { error });
    return fail(AppError.internal("Unhandled action error", error));
  }
}
