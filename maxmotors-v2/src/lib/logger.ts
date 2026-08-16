/**
 * Structured logger.
 *
 * Emits one JSON object per line in production so a log drain can index by
 * `event` and `level`; stays human-readable in development. Context is always a
 * flat object, never interpolated into the message — that is what makes logs
 * queryable after the fact.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;

export type LogLevel = keyof typeof LEVELS;

type LogContext = Record<string, unknown>;

function resolveThreshold(): number {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVELS) return LEVELS[configured];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

const threshold = resolveThreshold();
const isProduction = process.env.NODE_ENV === "production";

/** Errors do not survive JSON.stringify — pull the useful fields out first. */
function serializeContext(context: LogContext): LogContext {
  const output: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    output[key] =
      value instanceof Error
        ? {
            name: value.name,
            message: value.message,
            ...(isProduction ? {} : { stack: value.stack }),
          }
        : value;
  }
  return output;
}

function emit(level: LogLevel, event: string, context: LogContext = {}): void {
  if (LEVELS[level] < threshold) return;

  const payload = {
    level,
    event,
    time: new Date().toISOString(),
    ...serializeContext(context),
  };

  const line = isProduction ? JSON.stringify(payload) : `[${level}] ${event}`;
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";

  if (isProduction) {
    // eslint-disable-next-line no-console
    console[method](line);
  } else {
    // eslint-disable-next-line no-console
    console[method](line, Object.keys(context).length ? serializeContext(context) : "");
  }
}

export const logger = {
  debug: (event: string, context?: LogContext) => emit("debug", event, context),
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context),
};
