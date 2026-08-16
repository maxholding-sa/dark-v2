import { z } from "zod";
import { slugify } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

/**
 * Articles carry rich content in a `contentSections` Json column.
 *
 * v1 stored whatever the editor posted and re-parsed it at render time with
 * `typeof x === "string" ? JSON.parse(x) : x`, so a malformed section crashed
 * the public page. Modelling the sections as a discriminated union means bad
 * content is rejected at write time, and the renderer can switch exhaustively
 * on `type` with the compiler checking that every case is handled.
 */

const textSection = z.object({
  type: z.literal("text"),
  content: z.string().trim().min(1).max(20000),
});

const headingSection = z.object({
  type: z.literal("heading"),
  content: z.string().trim().min(1).max(300),
  level: z.union([z.literal(2), z.literal(3)]).default(2),
});

const imageSection = z.object({
  type: z.literal("image"),
  src: z.string().url("validation.invalidUrl"),
  alt: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).optional(),
});

const videoSection = z.object({
  type: z.literal("video"),
  src: z.string().url("validation.invalidUrl"),
  caption: z.string().trim().max(500).optional(),
});

const quoteSection = z.object({
  type: z.literal("quote"),
  content: z.string().trim().min(1).max(2000),
  attribution: z.string().trim().max(200).optional(),
});

export const contentSectionSchema = z.discriminatedUnion("type", [
  textSection,
  headingSection,
  imageSection,
  videoSection,
  quoteSection,
]);
export type ContentSection = z.infer<typeof contentSectionSchema>;

export const contentSectionsSchema = z.array(contentSectionSchema).max(200);

/**
 * Parses a stored Json column. Returns `[]` rather than throwing, because a
 * legacy row written before this schema existed must not break the page — the
 * `content` text column is the fallback body.
 */
export function parseContentSections(value: unknown): ContentSection[] {
  if (value == null) return [];

  const raw = typeof value === "string" ? safeJsonParse(value) : value;
  const parsed = contentSectionsSchema.safeParse(raw);

  return parsed.success ? parsed.data : [];
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** URL-safe slug that keeps Arabic letters, since titles are Arabic. */
const slug = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(200)
  .transform(slugify)
  .pipe(z.string().min(1, "validation.required"));

export const articleInputSchema = z.object({
  title: z.string().trim().min(3, "validation.tooShort").max(300),
  slug: slug.optional(),
  /** Plain-text body, kept for rows that predate `contentSections`. */
  content: z.string().trim().max(50000).default(""),
  contentSections: contentSectionsSchema.default([]),
  excerpt: z
    .string()
    .trim()
    .max(600)
    .transform((value) => value || null)
    .nullable()
    .optional(),
  image: z
    .union([z.literal(""), z.string().url("validation.invalidUrl")])
    .transform((value) => value || null)
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  published: z.boolean().default(false),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const articleUpdateSchema = articleInputSchema.partial();
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const articleQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  tag: z.string().trim().max(60).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ArticleQuery = z.infer<typeof articleQuerySchema>;

export function parseArticleQuery(input: unknown): ArticleQuery {
  const parsed = articleQuerySchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : articleQuerySchema.parse({});
}

export const articleIdSchema = z.string().uuid("validation.required");
export const articleSlugSchema = z.string().trim().min(1).max(220);
