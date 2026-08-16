import { getCarsByFilters } from "@/actions/car-listing";
import React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import CarCard from "@/components/CarCard";
import ActiveFilterChips from "./ActiveFilterChips";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

const LIMIT = 6;

// Filter keys that make up a listing URL. Anything else is dropped when we
// rebuild pagination links so crawlers never see junk params echoed back.
const FILTER_KEYS = [
  "search",
  "make",
  "bodyType",
  "isEconomic",
  "isCommercial",
  "color",
  "fuelType",
  "transmission",
  "minPrice",
  "maxPrice",
  "sortBy",
];

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

const readParam = (params, key, fallback = "") => {
  const value = firstValue(params?.[key]);
  return value === undefined || value === null ? fallback : value;
};

const readPage = (params) => {
  const parsed = Number.parseInt(readParam(params, "page", "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

/** Build a real, crawlable /cars URL that preserves the active filters. */
const buildPageUrl = (params, pageNumber) => {
  const next = new URLSearchParams();

  FILTER_KEYS.forEach((key) => {
    const value = readParam(params, key);
    if (value === "") return;
    // The default sort is what /cars already shows; echoing it back would emit a
    // duplicate URL for every page that crawlers have to fetch and discard.
    if (key === "sortBy" && value === "newest") return;
    next.set(key, String(value));
  });

  if (pageNumber > 1) next.set("page", String(pageNumber));

  const query = next.toString();
  return query ? `/cars?${query}` : "/cars";
};

/**
 * Anchor styled like the shadcn PaginationLink, but backed by next/link so the
 * href is present in the server HTML *and* navigation stays client-side.
 */
const PageLink = ({ href, isActive, size = "icon", className, children }) => (
  <Link
    href={href}
    aria-current={isActive ? "page" : undefined}
    data-slot="pagination-link"
    data-active={isActive}
    className={cn(
      buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
      className
    )}
  >
    {children}
  </Link>
);

/** Non-navigating stand-in for prev/next at the ends of the range. */
const DisabledPageLink = ({ size = "icon", className, children }) => (
  <span
    aria-disabled="true"
    data-slot="pagination-link"
    className={cn(
      buttonVariants({ variant: "ghost", size }),
      "pointer-events-none opacity-50",
      className
    )}
  >
    {children}
  </span>
);

/**
 * Server component: the listing is rendered on the server so the initial HTML
 * contains the car cards and their links. This page is the main crawl entry
 * point into every /cars/<id> detail page, so the results must not depend on
 * client-side JavaScript running first.
 */
const CarListings = async ({ priceRange, searchParams = {} }) => {
  const page = readPage(searchParams);

  const result = await getCarsByFilters({
    search: readParam(searchParams, "search"),
    make: readParam(searchParams, "make"),
    bodyType: readParam(searchParams, "bodyType"),
    isEconomic: readParam(searchParams, "isEconomic") === "true" || undefined,
    isCommercial: readParam(searchParams, "isCommercial") === "true" || undefined,
    color: readParam(searchParams, "color"),
    fuelType: readParam(searchParams, "fuelType"),
    transmission: readParam(searchParams, "transmission"),
    minPrice: readParam(searchParams, "minPrice", 0),
    maxPrice: readParam(searchParams, "maxPrice", Number.MAX_SAFE_INTEGER),
    sortBy: readParam(searchParams, "sortBy", "newest"),
    page,
    limit: LIMIT,
  });

  // Error if unable to fetch cars data
  if (!result || !result.success || !result.data) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          فشل تحميل السيارات. يرجى المحاولة مرة أخرى لاحقاً.
        </AlertDescription>
      </Alert>
    );
  }

  const { data: cars, pagination } = result;

  // No results then show
  if (cars.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border border-gray-800 rounded-xl bg-gray-950">
        <div className="bg-gray-900 p-4 rounded-full mb-4">
          <Info className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-white">لم يتم العثور على سيارات</h3>
        <p className="text-gray-400 mb-6 max-w-md">
          لم نتمكن من العثور على أي سيارات تطابق معايير البحث الخاصة بك. جرب تعديل الفلاتر أو مصطلح البحث.
        </p>
        <Button variant="outline" asChild className="border-gray-700 text-white hover:bg-gray-900">
          <Link href="/cars">مسح جميع الفلاتر</Link>
        </Button>
      </div>
    );
  }

  // Calculate which page numbers to show (first, last, and around current page)
  const visiblePageNumbers = [1];

  for (
    let i = Math.max(2, page - 1);
    i <= Math.min(pagination.pages - 1, page + 1);
    i++
  ) {
    visiblePageNumbers.push(i);
  }

  if (pagination.pages > 1) {
    visiblePageNumbers.push(pagination.pages);
  }

  // Sort and deduplicate
  const uniquePageNumbers = [...new Set(visiblePageNumbers)].sort((a, b) => a - b);

  // Create pagination items with ellipses
  const paginationItems = [];
  let lastPageNumber = 0;

  uniquePageNumbers.forEach((pageNumber) => {
    if (pageNumber - lastPageNumber > 1) {
      paginationItems.push(
        <PaginationItem key={`ellipsis-${pageNumber}`}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    paginationItems.push(
      <PaginationItem key={pageNumber}>
        <PageLink
          href={buildPageUrl(searchParams, pageNumber)}
          isActive={pageNumber === page}
        >
          {pageNumber}
        </PageLink>
      </PaginationItem>
    );

    lastPageNumber = pageNumber;
  });

  return (
    <div>
      <ActiveFilterChips priceRange={priceRange} />

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          عرض{" "}
          <span className="font-medium">
            {(page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, pagination.total)}
          </span>{" "}
          من <span className="font-medium">{pagination.total}</span> سيارة
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {cars?.map((car) => {
          return <CarCard key={car.id} car={car} />;
        })}
      </div>

      {/* shadcn Pagination */}
      {pagination.pages > 1 && (
        <Pagination className="mt-10">
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PageLink
                  href={buildPageUrl(searchParams, page - 1)}
                  size="default"
                  className="gap-1 px-2.5 sm:pl-2.5"
                >
                  <ChevronRightIcon />
                  <span className="hidden sm:block">السابق</span>
                </PageLink>
              ) : (
                <DisabledPageLink size="default" className="gap-1 px-2.5 sm:pl-2.5">
                  <ChevronRightIcon />
                  <span className="hidden sm:block">السابق</span>
                </DisabledPageLink>
              )}
            </PaginationItem>

            {paginationItems}

            <PaginationItem>
              {page < pagination.pages ? (
                <PageLink
                  href={buildPageUrl(searchParams, page + 1)}
                  size="default"
                  className="gap-1 px-2.5 sm:pr-2.5"
                >
                  <span className="hidden sm:block">التالي</span>
                  <ChevronLeftIcon />
                </PageLink>
              ) : (
                <DisabledPageLink size="default" className="gap-1 px-2.5 sm:pr-2.5">
                  <span className="hidden sm:block">التالي</span>
                  <ChevronLeftIcon />
                </DisabledPageLink>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default CarListings;
