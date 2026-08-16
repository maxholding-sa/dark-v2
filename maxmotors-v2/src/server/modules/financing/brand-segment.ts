import {
  BRAND_NAME_ALIASES,
  DEFAULT_BRAND_SEGMENT_MAP,
  INSURANCE_SEGMENTS,
  type InsuranceSegment,
} from "./finance.constants";
import { AppError } from "@/server/errors/app-error";

/**
 * Maps a car's make to its insurance segment (A–G), which sets the premium.
 *
 * The make is free text typed by an admin, in Arabic or English, with whatever
 * spelling they used — so the lookup normalises and goes through an alias table
 * rather than matching the stored string.
 *
 * An unmapped brand is an error, never a default. v1 originally fell back to
 * segment A, which silently quoted the cheapest premium for an unrecognised
 * luxury brand; `BrandSegmentNotFoundError` exists because that was wrong.
 */

/** Trim, collapse whitespace, lowercase. */
export function normalizeBrandKey(brand: string | null | undefined): string {
  if (brand == null) return "";
  return String(brand).trim().replace(/\s+/g, " ").toLowerCase();
}

export function isInsuranceSegment(value: unknown): value is InsuranceSegment {
  return (
    typeof value === "string" &&
    (INSURANCE_SEGMENTS as readonly string[]).includes(value.toUpperCase())
  );
}

export function validateInsuranceSegment(value: unknown): InsuranceSegment {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!isInsuranceSegment(upper)) {
    throw AppError.validation(`"${String(value)}" is not a valid insurance segment`);
  }

  return upper;
}

/**
 * Builds a normalised lookup, then layers the aliases on top so an Arabic
 * spelling resolves to whatever segment its canonical English key holds.
 */
export function buildBrandSegmentLookup(
  rawMap: Record<string, unknown> | null | undefined,
  aliases: Record<string, string> = BRAND_NAME_ALIASES,
): Map<string, string> {
  const lookup = new Map<string, string>();
  if (!rawMap || typeof rawMap !== "object") return lookup;

  for (const [rawKey, segment] of Object.entries(rawMap)) {
    const key = normalizeBrandKey(rawKey);
    if (!key) continue;

    lookup.set(key, String(segment).trim().toUpperCase());
  }

  // An alias only resolves if its canonical key is actually in the map, so a
  // bank that omits a brand does not gain it through the alias table.
  for (const [aliasRaw, canonicalRaw] of Object.entries(aliases)) {
    const aliasKey = normalizeBrandKey(aliasRaw);
    const segment = lookup.get(normalizeBrandKey(canonicalRaw));

    if (segment && aliasKey) lookup.set(aliasKey, segment);
  }

  return lookup;
}

/** Parses a `brandSegmentMap` Json column, falling back when it is unusable. */
export function parseBrandSegmentMap(
  value: unknown,
  fallback: Record<string, string> = DEFAULT_BRAND_SEGMENT_MAP,
): Record<string, string> {
  if (value == null || value === "") return { ...fallback };

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      // Fall through to the fallback below.
    }
  }

  return { ...fallback };
}

export class BrandSegmentNotFoundError extends AppError {
  readonly brand: string;

  constructor(brand: string | null | undefined, mapLabel = "brand segment map") {
    const display = brand == null || brand === "" ? "(empty)" : String(brand).trim();

    super(
      "VALIDATION",
      `Brand "${display}" has no insurance category in ${mapLabel}. ` +
        `Add it to the category table or correct the make before saving.`,
      { messageKey: "errors.brandSegmentMissing" },
    );

    this.name = "BrandSegmentNotFoundError";
    this.brand = display;
  }
}

/** Resolves a segment, or throws. There is deliberately no default. */
export function resolveSegmentFromMap(
  rawMap: Record<string, unknown> | null | undefined,
  brand: string | null | undefined,
  mapLabel = "brand segment map",
): InsuranceSegment {
  const key = normalizeBrandKey(brand);
  if (!key) throw new BrandSegmentNotFoundError(brand, mapLabel);

  const segment = buildBrandSegmentLookup(rawMap).get(key);
  if (!segment) throw new BrandSegmentNotFoundError(brand, mapLabel);

  return validateInsuranceSegment(segment);
}

/** Resolves against the built-in default table. */
export function resolveSegmentForBrand(brand: string | null | undefined): InsuranceSegment {
  return resolveSegmentFromMap(
    DEFAULT_BRAND_SEGMENT_MAP,
    brand,
    "default brand category table",
  );
}

export function isBrandMapped(
  rawMap: Record<string, unknown> | null | undefined,
  brand: string | null | undefined,
): boolean {
  const key = normalizeBrandKey(brand);
  return key !== "" && buildBrandSegmentLookup(rawMap).has(key);
}

export type { InsuranceSegment };
