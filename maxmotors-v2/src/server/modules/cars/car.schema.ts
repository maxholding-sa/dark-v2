import { z } from "zod";
import { normalizeCarText } from "@/lib/car-text";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

/**
 * Every shape that crosses the module boundary is declared here.
 *
 * Two things follow from that. Validation happens once, at the edge, so the
 * service can trust its arguments. And the TypeScript types are *derived* from
 * the schemas (`z.infer`), so a validation rule and its type can never disagree
 * — the failure mode v1 had no defence against, since it validated by hand in
 * some actions and not at all in others.
 */

const CAR_STATUSES = ["AVAILABLE", "UNAVAILABLE", "SOLD"] as const;

export const SORT_OPTIONS = [
  "newest",
  "priceAsc",
  "priceDesc",
  "mileageAsc",
  "yearDesc",
] as const;
export type CarSortOption = (typeof SORT_OPTIONS)[number];

/** Trims and strips invisible characters before anything reaches the database. */
const carText = (max: number) =>
  z
    .string()
    .transform(normalizeCarText)
    .pipe(z.string().min(1, "validation.required").max(max, "validation.tooLong"));

const optionalCarText = (max: number) =>
  z
    .string()
    .transform(normalizeCarText)
    .pipe(z.string().max(max, "validation.tooLong"))
    .transform((value) => value || null)
    .nullable()
    .optional();

const CURRENT_YEAR = new Date().getFullYear();

export const carInputSchema = z.object({
  make: carText(60),
  model: carText(60),
  year: z
    .number()
    .int()
    .min(1950, "validation.yearRange")
    // Dealers list next model year before the calendar catches up.
    .max(CURRENT_YEAR + 2, "validation.yearRange"),
  price: z.number().positive("validation.priceMin").max(100_000_000),
  mileage: z.number().int().min(0).max(2_000_000),
  color: carText(40),
  fuelType: carText(40),
  transmission: carText(40),
  bodyType: carText(40),
  description: z.string().trim().min(10, "validation.tooShort").max(8000),

  category: optionalCarText(60),
  driveType: optionalCarText(40),
  seats: z.number().int().min(1).max(60).nullable().optional(),
  videoUrl: z.string().url("validation.invalidUrl").nullable().optional(),
  insuranceSegment: z
    .string()
    .regex(/^[A-G]$/, "validation.required")
    .nullable()
    .optional(),

  isLuxury: z.boolean().default(false),
  isEconomic: z.boolean().default(false),
  isCommercial: z.boolean().default(false),
  featured: z.boolean().default(false),
  testDriveAvailable: z.boolean().default(true),
  status: z.enum(CAR_STATUSES).default("AVAILABLE"),

  images: z
    .array(z.string().url())
    .min(1, "validation.imagesRequired")
    .max(30, "validation.tooLong"),
});

export type CarInput = z.infer<typeof carInputSchema>;

/** Update allows partial payloads; the id is validated separately. */
export const carUpdateSchema = carInputSchema.partial();
export type CarUpdateInput = z.infer<typeof carUpdateSchema>;

export const carIdSchema = z.string().uuid("validation.required");

/** Flags an admin can flip from the list without opening the full form. */
export const carStatusSchema = z.object({
  status: z.enum(CAR_STATUSES).optional(),
  featured: z.boolean().optional(),
  testDriveAvailable: z.boolean().optional(),
});
export type CarStatusInput = z.infer<typeof carStatusSchema>;

/**
 * A tri-state flag: present-and-on, or absent.
 *
 * Deliberately not `z.coerce.boolean()` — that runs JavaScript truthiness, so
 * the string `"false"` coerces to `true` and `?isEconomic=false` would filter
 * the listing down to economy cars. Only an explicit "on" value counts;
 * anything else becomes `undefined`, meaning "don't filter on this".
 */
const optionalFlag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) =>
    value === true || value === "true" || value === "1" ? true : undefined,
  );

/**
 * Query parameters for the public listing.
 *
 * `coerce` is what lets the page hand raw `searchParams` straight in: URL
 * values are always strings, and this is the single place that converts them.
 */
export const carQuerySchema = z
  .object({
    search: z.string().trim().max(120).default(""),
    make: z.string().trim().max(60).default(""),
    bodyType: z.string().trim().max(40).default(""),
    fuelType: z.string().trim().max(40).default(""),
    transmission: z.string().trim().max(40).default(""),
    color: z.string().trim().max(40).default(""),

    minPrice: z.coerce.number().min(0).default(0),
    maxPrice: z.coerce.number().min(0).optional(),

    isEconomic: optionalFlag,
    isCommercial: optionalFlag,
    isLuxury: optionalFlag,

    sortBy: z.enum(SORT_OPTIONS).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  // A reversed range returns nothing at all, which reads as a broken page.
  // Swapping is the behaviour a user means.
  .transform((query) => {
    if (query.maxPrice !== undefined && query.maxPrice < query.minPrice) {
      return { ...query, minPrice: query.maxPrice, maxPrice: query.minPrice };
    }
    return query;
  });

export type CarQuery = z.infer<typeof carQuerySchema>;

/**
 * Parses untrusted `searchParams` and falls back to defaults rather than
 * throwing — a hand-edited URL should show the default listing, not a 500.
 */
export function parseCarQuery(input: unknown): CarQuery {
  const parsed = carQuerySchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : carQuerySchema.parse({});
}
