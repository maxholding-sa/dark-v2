/**
 * Arabic-tolerant search normalisation.
 *
 * Buyers type "تويوتا كامري", "تويوتا كامرى", "toyota camry" and expect the
 * same results. Postgres `ILIKE` compares bytes, so the query terms have to be
 * expanded into spelling variants before they reach the database.
 *
 * Distilled from v1 `src/lib/car-search.js` (652 lines mixing normalisation,
 * Prisma builders, Supabase builders, budget parsing and chatbot query
 * construction). Only the normalisation belongs in a shared lib; the Prisma
 * `where` construction now lives with the cars module that owns it.
 */

const ARABIC_DIACRITICS = /[ً-ْٰ]/g;
const TATWEEL = /ـ/g;

/** Folds spelling differences that Arabic speakers treat as identical. */
export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .normalize("NFC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Spelling variants to match against the database. The stored value was never
 * normalised, so matching a normalised query against it would miss rows —
 * expanding the query instead keeps existing data usable without a backfill.
 */
export function buildSpellingVariants(term: string): string[] {
  const normalized = normalizeSearchText(term);
  if (!normalized) return [];

  const variants = new Set<string>([term.trim(), normalized]);

  // Alef forms.
  variants.add(normalized.replace(/ا/g, "أ"));
  // Ya / alef maqsura.
  variants.add(normalized.replace(/ي/g, "ى"));
  // Ta marbuta.
  variants.add(normalized.replace(/ه/g, "ة"));
  variants.add(normalized.replace(/ه$/, "ة"));

  return [...variants].filter(Boolean);
}

/** Splits a query into terms, dropping noise words that match everything. */
export function tokenizeQuery(query: string): string[] {
  const STOP_WORDS = new Set(["سيارة", "سيارات", "car", "cars", "من", "في", "the"]);

  return normalizeSearchText(query)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Escapes the `%` and `_` wildcards so a literal query cannot become one. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
