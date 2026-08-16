import { z } from "zod";

/**
 * Featured brands, featured models and mandebs (field agents).
 *
 * Grouped into one module because they are the same shape — a small, ordered,
 * hand-curated list an editor arranges for the home page. v1 had three separate
 * action files, three admin folders and three near-identical dialogs.
 */

/** Both featured lists carry a bilingual name, an image and a sort position. */
const featuredItemSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(120),
  nameAr: z.string().trim().min(1, "validation.required").max(120),
  image: z.string().url("validation.invalidUrl"),
  order: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const featuredBrandSchema = featuredItemSchema;
export type FeaturedBrandInput = z.infer<typeof featuredBrandSchema>;

export const featuredModelSchema = featuredItemSchema;
export type FeaturedModelInput = z.infer<typeof featuredModelSchema>;

export const mandebSchema = z.object({
  name: z.string().trim().min(2, "validation.tooShort").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{7,20}$/, "validation.invalidNumber"),
  city: z.string().trim().min(2, "validation.tooShort").max(80),
});
export type MandebInput = z.infer<typeof mandebSchema>;

/** Drag-and-drop reordering submits the whole list, not one item at a time. */
export const reorderSchema = z
  .array(z.object({ id: z.string().uuid(), order: z.number().int().min(0).max(999) }))
  .max(200);
export type ReorderInput = z.infer<typeof reorderSchema>;

export const idSchema = z.string().uuid("validation.required");
