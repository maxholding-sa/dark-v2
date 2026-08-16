import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

/**
 * The one form on the site an anonymous visitor can write to, so the limits
 * here are the first line of spam defence — the rate limiter is the second.
 */
export const contactInputSchema = z.object({
  name: z.string().trim().min(2, "validation.tooShort").max(120),
  email: z.string().trim().email("validation.invalidUrl").max(200),
  subject: z.string().trim().min(3, "validation.tooShort").max(200),
  message: z.string().trim().min(10, "validation.tooShort").max(4000),
  /**
   * Honeypot. Hidden from users with CSS, so a human always leaves it empty;
   * bots that fill every field give themselves away. Cheap and invisible,
   * unlike a CAPTCHA.
   */
  website: z.string().max(0, "validation.required").optional(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const contactQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ContactQuery = z.infer<typeof contactQuerySchema>;

export function parseContactQuery(input: unknown): ContactQuery {
  const parsed = contactQuerySchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : contactQuerySchema.parse({});
}

export const contactIdSchema = z.string().uuid("validation.required");
