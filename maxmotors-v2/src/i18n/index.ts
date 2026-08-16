import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import { siteConfig, type Locale } from "@/config/site";
import type { Translations } from "./types";

/**
 * Translation lookup.
 *
 * Deliberately dependency-free and synchronous: the dictionaries are small,
 * both ship in the bundle, and that removes the async-boundary problems that
 * make locale switching awkward in the App Router. If the copy grows past a
 * few hundred keys, swap `dictionaries` for dynamic imports — the `t()` call
 * sites will not change.
 */

const dictionaries: Record<Locale, Translations> = {
  ar: ar as unknown as Translations,
  en,
};

export function getDictionary(locale: Locale = siteConfig.defaultLocale): Translations {
  return dictionaries[locale] ?? dictionaries[siteConfig.defaultLocale];
}

/** Dot path into the dictionary, e.g. `"cars.filters.title"`. */
export type TranslationKey = string;

/**
 * Resolves a key and substitutes `{placeholder}` values.
 * A missing key returns the key itself — visible in the UI during development,
 * harmless in production, and never `undefined`.
 */
export function translate(
  dictionary: Translations,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
      dictionary,
    );

  if (typeof value !== "string") return key;
  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Bound translator for a locale — the usual entry point in a component. */
export function createTranslator(locale: Locale = siteConfig.defaultLocale) {
  const dictionary = getDictionary(locale);
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(dictionary, key, params);
}

export type Translator = ReturnType<typeof createTranslator>;
export type { Locale, Translations };
