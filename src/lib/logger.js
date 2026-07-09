const isDevelopment = process.env.NODE_ENV !== "production";

const isDebugEnabled =
  isDevelopment ||
  process.env.ENABLE_DEBUG_LOGS === "true" ||
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true";

const formatError = (error) => {
  if (!error) return error;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
    };
  }
  return error;
};

const write = (method, args) => {
  if (typeof console === "undefined") return;
  console[method](...args.map(formatError));
};

export const logger = {
  debug: (...args) => {
    if (isDebugEnabled) write("debug", args);
  },
  info: (...args) => {
    if (isDebugEnabled) write("info", args);
  },
  warn: (...args) => {
    write("warn", args);
  },
  error: (...args) => {
    write("error", args);
  },
};
