import { z } from "zod";
import { AppError, type FieldErrors } from "./app-error";

/**
 * The single place untrusted input becomes typed data.
 *
 * Every service entry point takes `unknown` and runs it through `parseOrThrow`.
 * After that line the value is typed and trusted, which is what lets the rest of
 * a service read as business logic rather than defensive checks.
 */

/** Flattens a Zod failure into the field-keyed shape a form can render. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};

  for (const issue of error.issues) {
    // A top-level refinement has an empty path; group those under `_form` so
    // the UI can still show them somewhere.
    const key = issue.path.join(".") || "_form";
    (fields[key] ??= []).push(issue.message);
  }

  return fields;
}

/** Parses input or throws a VALIDATION `AppError` carrying the field errors. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, label = "input"): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw AppError.validation(`Invalid ${label}`, toFieldErrors(parsed.error));
  }

  return parsed.data;
}
