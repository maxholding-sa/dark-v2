import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

/** Customer testimonials shown on the public reviews page and the home page. */

export const reviewInputSchema = z.object({
  clientName: z.string().trim().min(2, "validation.tooShort").max(120),
  city: z.string().trim().min(2, "validation.tooShort").max(80),
  /** Free text — the car as the customer described it, not a Car relation. */
  car: z.string().trim().min(1, "validation.required").max(120),
  rating: z.number().int().min(1, "validation.invalidNumber").max(5, "validation.invalidNumber"),
  reviewText: z.string().trim().min(10, "validation.tooShort").max(4000),
  videoUrl: z
    .union([z.literal(""), z.string().url("validation.invalidUrl")])
    .transform((value) => value || null)
    .nullable()
    .optional(),
  imageUrl: z
    .union([z.literal(""), z.string().url("validation.invalidUrl")])
    .transform((value) => value || null)
    .nullable()
    .optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const reviewUpdateSchema = reviewInputSchema.partial();
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;

export const reviewQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

export function parseReviewQuery(input: unknown): ReviewQuery {
  const parsed = reviewQuerySchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : reviewQuerySchema.parse({});
}

export const reviewIdSchema = z.string().uuid("validation.required");
