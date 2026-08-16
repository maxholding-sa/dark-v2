import { z } from "zod";

/**
 * Schemas for everything an editor can change about the site itself.
 *
 * v1 split this across `admin/site-data/` and `admin/site-management/` — two
 * parallel implementations of the same CMS, each with its own forms and its own
 * partial validation. One module, one set of rules.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "validation.tooLong")
    .transform((value) => value || null)
    .nullable()
    .optional();

/** Saudi mobile in local or international form, stored as typed. */
const phone = z
  .string()
  .trim()
  .regex(/^[+()\d\s-]{7,20}$/, "validation.invalidNumber")
  .transform((value) => value || null)
  .nullable()
  .optional();

// --- Store info (singleton) ------------------------------------------------

export const storeInfoSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(120),
  description: optionalText(2000),
  address: optionalText(300),
  city: optionalText(80),
  country: optionalText(80),
  phone,
  whatsapp: phone,
  email: z
    .union([z.literal(""), z.string().email("validation.invalidUrl")])
    .transform((value) => value || null)
    .nullable()
    .optional(),
  latitude: optionalText(40),
  longitude: optionalText(40),
  whatsappEnabled: z.boolean().default(true),
  whatsappLabel: optionalText(120),
  whatsappText: optionalText(600),
});
export type StoreInfoInput = z.infer<typeof storeInfoSchema>;

// --- Social media ----------------------------------------------------------

/** Platforms the footer knows how to render an icon for. */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "youtube",
  "tiktok",
  "snapchat",
  "whatsapp",
  "linkedin",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const socialMediaSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().url("validation.invalidUrl"),
  icon: optionalText(60),
  order: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});
export type SocialMediaInput = z.infer<typeof socialMediaSchema>;

// --- Logo ------------------------------------------------------------------

export const LOGO_TYPES = ["main", "white", "favicon"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export const logoSchema = z.object({
  imageUrl: z.string().url("validation.invalidUrl"),
  altText: z.string().trim().min(1, "validation.required").max(160),
  type: z.enum(LOGO_TYPES).default("main"),
  isActive: z.boolean().default(true),
});
export type LogoInput = z.infer<typeof logoSchema>;

// --- Hero section (singleton) ---------------------------------------------

export const heroSectionSchema = z.object({
  videoUrl: z.string().min(1, "validation.required").max(500),
  title: z.string().trim().min(1, "validation.required").max(160),
  subtitle: optionalText(300),
  posterImage: optionalText(500),
  isActive: z.boolean().default(true),
  autoplay: z.boolean().default(true),
  loop: z.boolean().default(true),
  muted: z.boolean().default(true),
});
export type HeroSectionInput = z.infer<typeof heroSectionSchema>;

// --- About page (singleton + features) ------------------------------------

export const aboutPageSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(160),
  introText: z.string().trim().min(1, "validation.required").max(4000),
  visionTitle: z.string().trim().min(1, "validation.required").max(160),
  visionParagraph1: z.string().trim().min(1, "validation.required").max(4000),
  visionParagraph2: z.string().trim().max(4000),
  visionImage: optionalText(500),
  visionImageAlt: optionalText(160),
  missionTitle: z.string().trim().min(1, "validation.required").max(160),
  missionParagraph1: z.string().trim().min(1, "validation.required").max(4000),
  missionParagraph2: z.string().trim().max(4000),
  missionImage: optionalText(500),
  missionImageAlt: optionalText(160),
  whyUsTitle: z.string().trim().min(1, "validation.required").max(200),
  ctaTitle: z.string().trim().min(1, "validation.required").max(200),
  ctaText: z.string().trim().min(1, "validation.required").max(2000),
  isPublished: z.boolean().default(true),
  metaDescription: optionalText(320),
  metaKeywords: optionalText(320),
});
export type AboutPageInput = z.infer<typeof aboutPageSchema>;

export const aboutFeatureSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(160),
  description: z.string().trim().min(1, "validation.required").max(2000),
  /** A lucide-react icon name; the renderer falls back when unknown. */
  icon: z.string().trim().min(1).max(60).default("Target"),
  order: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});
export type AboutFeatureInput = z.infer<typeof aboutFeatureSchema>;

// --- Tracking pixels (singleton) ------------------------------------------

export const pixelSettingsSchema = z.object({
  facebookPixel: optionalText(120),
  googleAnalytics: optionalText(120),
  googleAdsId: optionalText(120),
  tiktokPixel: optionalText(120),
  snapchatPixel: optionalText(120),
  microsoftClarity: optionalText(120),
});
export type PixelSettingsInput = z.infer<typeof pixelSettingsSchema>;

// --- Dealership + working hours -------------------------------------------

export const DAYS_OF_WEEK = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const dealershipInfoSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(160),
  address: z.string().trim().min(1, "validation.required").max(300),
  phone: z.string().trim().min(1, "validation.required").max(40),
  email: z.string().email("validation.invalidUrl"),
});
export type DealershipInfoInput = z.infer<typeof dealershipInfoSchema>;

/** 24-hour `HH:MM`. Stored as text because opening times are not instants. */
const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalidNumber");

export const workingHourSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    openTime: timeOfDay,
    closeTime: timeOfDay,
    isOpen: z.boolean().default(true),
  })
  // A closed day keeps whatever times it had, so reopening restores them —
  // only an open day has to make chronological sense.
  .refine((hour) => !hour.isOpen || hour.openTime < hour.closeTime, {
    message: "validation.invalidNumber",
    path: ["closeTime"],
  });
export type WorkingHourInput = z.infer<typeof workingHourSchema>;

export const workingHoursSchema = z
  .array(workingHourSchema)
  .max(7)
  // Two rows for the same day would race on write; the table's unique
  // constraint would reject it, but with an opaque Prisma error.
  .refine(
    (hours) => new Set(hours.map((hour) => hour.dayOfWeek)).size === hours.length,
    { message: "validation.required" },
  );

export const idSchema = z.string().uuid("validation.required");
