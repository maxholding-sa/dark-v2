/**
 * The one error type the domain throws.
 *
 * v1 signalled failure three different ways — thrown `Error`, a returned
 * `{ success: false, error: "..." }`, and a bare `null` — so callers could not
 * tell "not found" from "not allowed" from "the database is down", and every
 * message leaked straight to the user in whatever language it happened to be.
 */

export const ERROR_CODES = {
  VALIDATION: "VALIDATION",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  EXTERNAL_SERVICE: "EXTERNAL_SERVICE",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EXTERNAL_SERVICE: 502,
  INTERNAL: 500,
};

/**
 * Field-level validation detail, keyed by form field name so a client form can
 * map it straight onto inputs.
 */
export type FieldErrors = Record<string, string[]>;

export interface AppErrorOptions {
  /** Translation key resolved by the UI. Never a raw user-facing sentence. */
  messageKey?: string;
  fieldErrors?: FieldErrors;
  /** Original error, kept for logs only — never serialised to the client. */
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly messageKey: string;
  readonly fieldErrors: FieldErrors | undefined;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.messageKey = options.messageKey ?? `errors.${code.toLowerCase()}`;
    this.fieldErrors = options.fieldErrors;
  }

  static validation(message: string, fieldErrors?: FieldErrors): AppError {
    return new AppError(ERROR_CODES.VALIDATION, message, {
      messageKey: "errors.validation",
      ...(fieldErrors ? { fieldErrors } : {}),
    });
  }

  static unauthenticated(message = "Authentication required"): AppError {
    return new AppError(ERROR_CODES.UNAUTHENTICATED, message);
  }

  static forbidden(message = "Insufficient permissions"): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(resource: string): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, `${resource} not found`, {
      messageKey: "errors.notFound",
    });
  }

  static conflict(message: string): AppError {
    return new AppError(ERROR_CODES.CONFLICT, message);
  }

  static external(service: string, cause?: unknown): AppError {
    return new AppError(
      ERROR_CODES.EXTERNAL_SERVICE,
      `${service} request failed`,
      cause !== undefined ? { cause } : {},
    );
  }

  static internal(message = "Unexpected error", cause?: unknown): AppError {
    return new AppError(
      ERROR_CODES.INTERNAL,
      message,
      cause !== undefined ? { cause } : {},
    );
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
