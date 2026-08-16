import type { CarQuery } from "@/server/modules/cars/client";

/**
 * URL is the source of truth for listing state.
 *
 * Filters, sort and page all live in the query string, so a filtered result is
 * linkable, shareable, back-button-correct and server-rendered. v1 held filter
 * state in React, which meant none of that worked and the listing could not be
 * indexed.
 */

/** Keys that are safe to echo back into a URL, in a stable order. */
const QUERY_KEYS = [
  "search",
  "make",
  "bodyType",
  "fuelType",
  "transmission",
  "color",
  "minPrice",
  "maxPrice",
  "isEconomic",
  "isCommercial",
  "isLuxury",
  "sortBy",
  "page",
] as const;

type QueryKey = (typeof QUERY_KEYS)[number];

/** Values equal to these are omitted, keeping shared URLs short and readable. */
const DEFAULTS: Record<QueryKey, string> = {
  search: "",
  make: "",
  bodyType: "",
  fuelType: "",
  transmission: "",
  color: "",
  minPrice: "0",
  maxPrice: "",
  isEconomic: "",
  isCommercial: "",
  isLuxury: "",
  sortBy: "newest",
  page: "1",
};

export type CarSearchParams = Partial<Record<QueryKey, string>>;

function serialize(query: CarQuery): CarSearchParams {
  return {
    search: query.search,
    make: query.make,
    bodyType: query.bodyType,
    fuelType: query.fuelType,
    transmission: query.transmission,
    color: query.color,
    minPrice: String(query.minPrice),
    maxPrice: query.maxPrice !== undefined ? String(query.maxPrice) : "",
    isEconomic: query.isEconomic ? "true" : "",
    isCommercial: query.isCommercial ? "true" : "",
    isLuxury: query.isLuxury ? "true" : "",
    sortBy: query.sortBy,
    page: String(query.page),
  };
}

/**
 * Builds a listing URL from the active query plus overrides.
 *
 * Changing any filter resets to page 1 — staying on page 7 of a result set that
 * now has two pages shows an empty grid, which reads as a broken filter.
 */
export function buildCarsHref(
  query: CarQuery,
  overrides: CarSearchParams = {},
  basePath = "/cars",
): string {
  const changesFilter = Object.keys(overrides).some((key) => key !== "page");
  const merged: CarSearchParams = {
    ...serialize(query),
    ...(changesFilter ? { page: "1" } : {}),
    ...overrides,
  };

  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = merged[key];
    if (value !== undefined && value !== "" && value !== DEFAULTS[key]) {
      params.set(key, value);
    }
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/** Filters the user can see and remove individually, for the active-chips row. */
export function activeFilters(
  query: CarQuery,
): { key: QueryKey; value: string; label: string }[] {
  const active: { key: QueryKey; value: string; label: string }[] = [];

  if (query.search) active.push({ key: "search", value: query.search, label: query.search });
  if (query.make) active.push({ key: "make", value: query.make, label: query.make });
  if (query.bodyType) {
    active.push({ key: "bodyType", value: query.bodyType, label: query.bodyType });
  }
  if (query.fuelType) {
    active.push({ key: "fuelType", value: query.fuelType, label: query.fuelType });
  }
  if (query.transmission) {
    active.push({ key: "transmission", value: query.transmission, label: query.transmission });
  }
  if (query.color) active.push({ key: "color", value: query.color, label: query.color });

  return active;
}
