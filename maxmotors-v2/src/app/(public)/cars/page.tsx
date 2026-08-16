import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { listCars, getFilterOptions, parseCarQuery } from "@/server/modules/cars";
import { CarCard } from "@/features/cars/components/car-card";
import { CarFilters } from "@/features/cars/components/car-filters";
import { buildCarsHref } from "@/features/cars/lib/car-search-params";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createTranslator } from "@/i18n";

export const metadata: Metadata = {
  title: "السيارات المتاحة",
  description: "تصفح مجموعة السيارات المتاحة للبيع والتمويل",
};

interface CarsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function CarGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * The listing renders on the server from the URL alone.
 *
 * Nothing here is a server action — a page reads through the service directly.
 * Actions exist for mutations, and using one for a read would turn a cacheable
 * GET into a POST round trip.
 */
async function CarResults({ searchParams }: { searchParams: Record<string, unknown> }) {
  const t = createTranslator();
  const query = parseCarQuery(searchParams);

  // Independent queries — run them together rather than in sequence.
  const [page, filterOptions] = await Promise.all([listCars(query), getFilterOptions()]);

  return (
    <>
      <CarFilters query={query} options={filterOptions} />

      <p className="text-sm text-muted" aria-live="polite">
        {t("cars.resultsCount", { count: page.total })}
      </p>

      {page.items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("cars.empty")}
          description={t("cars.emptyHint")}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((car, index) => (
            <CarCard key={car.id} car={car} priority={index < 3} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        buildHref={(target) => buildCarsHref(query, { page: String(target) })}
        labels={{ previous: t("common.previous"), next: t("common.next") }}
      />
    </>
  );
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const t = createTranslator();
  const resolved = await searchParams;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t("cars.title")}</h1>
        <p className="text-muted">{t("cars.subtitle")}</p>
      </header>

      {/* Keyed on the query so a filter change shows the skeleton immediately
          instead of leaving the previous results on screen while it loads. */}
      <Suspense key={JSON.stringify(resolved)} fallback={<CarGridSkeleton />}>
        <CarResults searchParams={resolved} />
      </Suspense>
    </div>
  );
}
