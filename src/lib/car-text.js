// Canonicalisation for free-text car fields (make / model).
//
// Values typed in the admin form or pasted from a CSV often carry invisible
// junk — leading/trailing spaces, doubled spaces, tatweel, bidi marks. Those
// values are stored verbatim, so `distinct: ['model']` returns "راف فور",
// " راف فور" and "راف فور " as three separate options in the dropdowns.

const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿ـ]/g;
const ARABIC_DIACRITICS = /[ً-ْٰ]/g;

/** Cleans a make/model string for storage: no invisible chars, single spaces. */
export function normalizeCarText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Grouping key for values that are the same name spelled differently
 * (أوربان/اوربان, ياء/ألف مقصورة, تاء مربوطة). Never store this — it is only
 * for comparing and de-duplicating.
 */
export function carTextKey(value) {
  return normalizeCarText(value)
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/**
 * Dropdown value standing for "this car has no trim recorded". A sentinel is
 * needed because an empty select value means "nothing chosen yet".
 */
export const NO_CATEGORY_VALUE = "__بدون فئة__";

/** Label shown for {@link NO_CATEGORY_VALUE}. */
export const NO_CATEGORY_LABEL = "بدون فئة";

/**
 * True when two stored values name the same thing. The dropdowns hand back the
 * cleaned spelling, so a byte-exact `where` would miss the rows that still carry
 * a trailing space — compare on the key instead.
 */
export function carTextEquals(a, b) {
  const keyA = carTextKey(a);
  const keyB = carTextKey(b);
  return keyA !== "" && keyA === keyB;
}

/** Keeps the first spelling seen per key, so lists never show the same name twice. */
export function dedupeCarTexts(values) {
  const seen = new Map();
  for (const value of values) {
    const cleaned = normalizeCarText(value);
    if (!cleaned) continue;
    const key = carTextKey(cleaned);
    if (!seen.has(key)) seen.set(key, cleaned);
  }
  return [...seen.values()];
}
