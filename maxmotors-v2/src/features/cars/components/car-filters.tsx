"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buildCarsHref, activeFilters } from "../lib/car-search-params";
import { createTranslator } from "@/i18n";
import { SORT_OPTIONS, type CarQuery, type CarFilterOptions } from "@/server/modules/cars/client";
import type { Locale } from "@/config/site";

interface CarFiltersProps {
  query: CarQuery;
  options: CarFilterOptions;
  locale?: Locale;
}

/**
 * Filters navigate; they do not fetch.
 *
 * Each change pushes a new URL and the server re-renders the listing. That
 * keeps result state in exactly one place — the URL — and means this component
 * holds no data, so it cannot disagree with what is on screen. The only local
 * state is the search box, which is debounced to avoid a navigation per
 * keystroke.
 */
export function CarFilters({ query, options, locale = "ar" }: CarFiltersProps) {
  const router = useRouter();
  const t = React.useMemo(() => createTranslator(locale), [locale]);

  const [searchTerm, setSearchTerm] = React.useState(query.search);

  // Keep the box in sync when the user navigates back to a different query.
  React.useEffect(() => setSearchTerm(query.search), [query.search]);

  const navigate = React.useCallback(
    (overrides: Parameters<typeof buildCarsHref>[1]) => {
      router.push(buildCarsHref(query, overrides));
    },
    [router, query],
  );

  React.useEffect(() => {
    if (searchTerm === query.search) return;

    const timer = setTimeout(() => navigate({ search: searchTerm }), 350);
    return () => clearTimeout(timer);
  }, [searchTerm, query.search, navigate]);

  const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));
  const chips = activeFilters(query);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="car-search" className="mb-1 block text-sm font-medium">
            {t("common.search")}
          </label>
          <Input
            id="car-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("cars.subtitle")}
          />
        </div>

        <div>
          <label htmlFor="filter-make" className="mb-1 block text-sm font-medium">
            {t("cars.filters.make")}
          </label>
          <Select
            id="filter-make"
            value={query.make}
            onChange={(event) => navigate({ make: event.target.value })}
            options={toOptions(options.makes)}
            placeholder={t("common.all")}
          />
        </div>

        <div>
          <label htmlFor="filter-body" className="mb-1 block text-sm font-medium">
            {t("cars.filters.bodyType")}
          </label>
          <Select
            id="filter-body"
            value={query.bodyType}
            onChange={(event) => navigate({ bodyType: event.target.value })}
            options={toOptions(options.bodyTypes)}
            placeholder={t("common.all")}
          />
        </div>

        <div>
          <label htmlFor="filter-fuel" className="mb-1 block text-sm font-medium">
            {t("cars.filters.fuelType")}
          </label>
          <Select
            id="filter-fuel"
            value={query.fuelType}
            onChange={(event) => navigate({ fuelType: event.target.value })}
            options={toOptions(options.fuelTypes)}
            placeholder={t("common.all")}
          />
        </div>

        <div>
          <label htmlFor="filter-transmission" className="mb-1 block text-sm font-medium">
            {t("cars.filters.transmission")}
          </label>
          <Select
            id="filter-transmission"
            value={query.transmission}
            onChange={(event) => navigate({ transmission: event.target.value })}
            options={toOptions(options.transmissions)}
            placeholder={t("common.all")}
          />
        </div>

        <div>
          <label htmlFor="filter-sort" className="mb-1 block text-sm font-medium">
            {t("cars.sort.label")}
          </label>
          <Select
            id="filter-sort"
            value={query.sortBy}
            onChange={(event) => navigate({ sortBy: event.target.value })}
            options={SORT_OPTIONS.map((option) => ({
              value: option,
              label: t(`cars.sort.${option}`),
            }))}
          />
        </div>

        <div>
          <label htmlFor="filter-max-price" className="mb-1 block text-sm font-medium">
            {t("cars.filters.maxPrice")}
          </label>
          <Input
            id="filter-max-price"
            type="number"
            inputMode="numeric"
            min={0}
            step={5000}
            defaultValue={query.maxPrice ?? ""}
            onBlur={(event) => navigate({ maxPrice: event.target.value })}
            placeholder={String(options.priceRange.max || "")}
          />
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="brand" className="gap-1 py-1 pe-1">
              {chip.label}
              <button
                type="button"
                onClick={() => navigate({ [chip.key]: "" })}
                aria-label={`${t("common.clear")}: ${chip.label}`}
                className="rounded-full p-0.5 hover:bg-brand/20"
              >
                <X className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}

          <Button variant="ghost" size="sm" onClick={() => router.push("/cars")}>
            {t("cars.filters.clearAll")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
