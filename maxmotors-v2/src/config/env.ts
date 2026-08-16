import { z } from "zod";

/**
 * Environment contract.
 *
 * v1 read `process.env.X` from ~40 files and discovered missing values at
 * request time (a chatbot 500, an image that would not upload). Here every
 * variable is declared once, parsed once, and typed. A bad value fails at
 * module load with a message naming the variable.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid postgres URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid postgres URL").optional(),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("car-images"),

  CLERK_SECRET_KEY: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
});

/**
 * Client variables must be listed explicitly. Next.js inlines `NEXT_PUBLIC_*`
 * at build time only when referenced as a full literal, so destructuring
 * `process.env` here would silently produce `undefined` in the browser.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((value) => value.replace(/\/$/, "")),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

const clientValues = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseClientEnv() {
  const parsed = clientSchema.safeParse(clientValues);
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatIssues(parsed.error)}\n` +
        `See .env.example for the expected shape.`,
    );
  }
  return parsed.data;
}

export const clientEnv = parseClientEnv();

/**
 * Server variables are read lazily. Importing this module from a client
 * component would otherwise throw on `DATABASE_URL`, which the browser never
 * has — the lazy call keeps the failure at the point of actual misuse.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (cachedServerEnv) return cachedServerEnv;

  if (typeof window !== "undefined") {
    throw new Error(
      "serverEnv() was called in the browser. Server secrets must never reach client code.",
    );
  }

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}\n` +
        `See .env.example for the expected shape.`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
