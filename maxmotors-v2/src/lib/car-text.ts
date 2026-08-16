/**
 * Canonicalisation for free-text car fields (make / model / category).
 *
 * Values typed into the admin form or pasted from a spreadsheet carry invisible
 * junk: leading and trailing spaces, doubled spaces, tatweel, bidi marks. They
 * are stored verbatim, so `distinct: ["model"]` returns "راف فور", " راف فور"
 * and "راف فور " as three separate dropdown options.
 *
 * Ported from v1 `src/lib/car-text.js` — the logic was correct, it just had no
 * types and no tests.
 */

// Zero-width joiners, bidi marks, BOM, and Arabic tatweel.
const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿ـ]/g;
const ARABIC_DIACRITICS = /[ً-ْٰ]/g;
const NON_BREAKING_SPACE = / /g;

/** Cleans a make/model string for storage: no invisible chars, single spaces. */
export function normalizeCarText(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(NON_BREAKING_SPACE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Grouping key for values that are the same name spelled differently
 * (أوربان/اوربان, ياء/ألف مقصورة, تاء مربوطة). Never store this — it exists
 * only for comparing and de-duplicating.
 */
export function carTextKey(value: string | null | undefined): string {
  return normalizeCarText(value)
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ -> ا
    .replace(/ى/g, "ي") // ى -> ي
    .replace(/ة/g, "ه") // ة -> ه
    .toLowerCase();
}

/**
 * Dropdown value standing for "this car has no trim recorded". A sentinel is
 * needed because an empty select value already means "nothing chosen yet".
 */
export const NO_CATEGORY_VALUE = "__بدون فئة__";
export const NO_CATEGORY_LABEL = "بدون فئة";

/**
 * True when two stored values name the same thing. Dropdowns hand back the
 * cleaned spelling, so a byte-exact `where` would miss rows that still carry a
 * trailing space — compare on the key instead.
 */
export function carTextEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const keyA = carTextKey(a);
  return keyA !== "" && keyA === carTextKey(b);
}

/** Keeps the first spelling seen per key, so lists never show a name twice. */
export function dedupeCarTexts(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();

  for (const value of values) {
    const cleaned = normalizeCarText(value);
    if (!cleaned) continue;

    const key = carTextKey(cleaned);
    if (!seen.has(key)) seen.set(key, cleaned);
  }

  return [...seen.values()];
}
