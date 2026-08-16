import type { Locale } from "@/config/site";

/**
 * Formatting helpers.
 *
 * These return strings, never JSX. v1's `helper.js` returned React elements
 * from a "util" module, which made it unimportable from server code, untestable
 * without a DOM, and impossible to use in a page title or a meta description.
 * Rendering the riyal glyph is the `<Price>` component's job.
 */

const LOCALE_TAGS: Record<Locale, string> = { ar: "ar-SA", en: "en-US" };

/** Western digits regardless of locale — Arabic-Indic numerals misread in prices. */
function numberFormatter(locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(`${LOCALE_TAGS[locale]}-u-nu-latn`, options);
}

export function formatNumber(value: number, locale: Locale = "ar"): string {
  return numberFormatter(locale).format(value);
}

/**
 * Amount only. The currency symbol is rendered separately so the Saudi riyal
 * glyph font can be applied to it without wrapping the digits.
 */
export function formatAmount(value: number | null | undefined, locale: Locale = "ar"): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numberFormatter(locale, { maximumFractionDigits: 0 }).format(numeric);
}

/**
 * A year, never grouped. `formatNumber(2025)` renders "2,025" — correct for a
 * quantity, wrong for a model year, and it read as a price at a glance.
 */
export function formatYear(value: number): string {
  return String(value);
}

export function formatMileage(value: number, locale: Locale = "ar"): string {
  return `${formatNumber(value, locale)} ${locale === "ar" ? "كم" : "km"}`;
}

export function formatDate(
  value: Date | string,
  locale: Locale = "ar",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(`${LOCALE_TAGS[locale]}-u-nu-latn`, options).format(date);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 2,
  locale: Locale = "ar",
): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return numberFormatter(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value)) + "%";
}

/** Truncates on a word boundary — used for meta descriptions and card blurbs. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/** URL-safe slug that keeps Arabic letters intact. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
