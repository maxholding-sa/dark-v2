import { clientEnv } from "./env";

/**
 * Static, non-secret facts about the deployment. Anything an editor should be
 * able to change at runtime (phone numbers, opening hours, social links) lives
 * in the database via the site-settings module — not here.
 */
export const siteConfig = {
  name: "Max Motors",
  nameAr: "ماكس موتورز",
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  defaultLocale: "ar",
  locales: ["ar", "en"],
  direction: { ar: "rtl", en: "ltr" },
  currency: "SAR",
  country: "SA",
} as const;

export type Locale = (typeof siteConfig.locales)[number];
