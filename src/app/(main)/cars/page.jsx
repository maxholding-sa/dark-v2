import { getCarFilters } from "@/actions/car-listing";
import React, { Suspense } from "react";
import LoadingBar from "@/components/LoadingBar";
import CarFilters from "./_components/CarFilters";
import CarListings from "./_components/CarListings";
import CarsPageWrapper from "./_components/CarsPageWrapper";
import {
  generateMetadata as buildMetadata,
  NOINDEX_FOLLOW_ROBOTS,
  SAUDI_MARKET_KEYWORDS,
  SITE_CONFIG,
} from "@/lib/seo";

const BASE_KEYWORDS = [
  "سيارات للبيع السعودية",
  "شراء سيارة مستعملة",
  "سيارات جديدة الرياض",
  "أسعار السيارات",
];

// Single-facet filters worth their own indexed page — they match how people
// actually search ("سيارات تويوتا للبيع"). Everything else (price, color,
// sort order, free-text search, or any combination) is a near-duplicate of
// /cars and gets noindex,follow instead.
const INDEXABLE_FACETS = ["make", "bodyType"];

const first = (value) => (Array.isArray(value) ? value[0] : value);

const readPageNumber = (params) => {
  const parsed = Number.parseInt(first(params?.page) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

/**
 * Decide how a listing URL should be presented to search engines.
 *
 * Paginated URLs must canonicalise to *themselves*: pointing /cars?page=2 at
 * /cars would tell Google the deeper pages are duplicates, and those pages are
 * the only crawl path to most of the inventory.
 */
const describeListingUrl = (params = {}) => {
  const pageNumber = readPageNumber(params);

  const activeFilters = Object.entries(params).filter(([key, value]) => {
    if (key === "page") return false;
    const raw = first(value);
    if (raw === undefined || raw === null || raw === "") return false;
    // The default sort is what /cars already shows — not a real filter.
    if (key === "sortBy" && raw === "newest") return false;
    return true;
  });

  const [facetKey, facetRawValue] = activeFilters[0] || [];
  const facetValue = first(facetRawValue);
  const isIndexableFacet =
    activeFilters.length === 1 && INDEXABLE_FACETS.includes(facetKey);
  const indexable = activeFilters.length === 0 || isIndexableFacet;

  const query = new URLSearchParams();

  if (indexable) {
    if (isIndexableFacet) query.set(facetKey, facetValue);
  } else {
    // Noindex pages canonicalise to themselves. A canonical pointing at /cars
    // while the page says noindex is a conflicting signal, and Google may carry
    // the noindex over to the canonical target — which would delist /cars.
    activeFilters.forEach(([key, value]) => query.set(key, first(value)));
  }

  if (pageNumber > 1) query.set("page", String(pageNumber));

  const search = query.toString();

  return {
    indexable,
    canonicalUrl: `${SITE_CONFIG.url}/cars${search ? `?${search}` : ""}`,
    facetKey: isIndexableFacet ? facetKey : null,
    facetValue: isIndexableFacet ? facetValue : null,
    pageSuffix: pageNumber > 1 ? ` - الصفحة ${pageNumber}` : "",
  };
};

export async function generateMetadata({ searchParams }) {
  const params = (await searchParams) ?? {};
  const { indexable, canonicalUrl, facetKey, facetValue, pageSuffix } =
    describeListingUrl(params);

  const title = facetKey
    ? `سيارات ${facetValue} للبيع في السعودية${pageSuffix}`
    : `تصفح وشراء السيارات في السعودية${pageSuffix}`;

  const description = facetKey
    ? `تصفح سيارات ${facetValue} المتوفرة للبيع في السعودية بأفضل الأسعار، مع تفاصيل كاملة وخيارات تمويل.`
    : "اكتشف آلاف السيارات الجديدة والمستعملة بأفضل الأسعار في السعودية. اختر من تويوتا، هيونداي، نيسان وغيرها. توفير وتمويل متاح.";

  return buildMetadata({
    title,
    description,
    keywords: facetValue
      ? [`سيارات ${facetValue}`, `${facetValue} للبيع`, ...BASE_KEYWORDS]
      : [...BASE_KEYWORDS, ...SAUDI_MARKET_KEYWORDS.brands],
    canonicalUrl,
    ogType: "website",
    ...(indexable ? {} : { robots: NOINDEX_FOLLOW_ROBOTS }),
  });
}

export const dynamic = "force-dynamic";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const CarsPage = async ({ searchParams }) => {
  const [resolvedSearchParams, filtersData] = await Promise.all([
    Promise.resolve(searchParams).then((params) => params ?? {}),
    getCarFilters(),
  ]);

  // Re-key the boundary on the query string so changing a filter re-suspends
  // and shows the loader instead of holding the previous results.
  const listingsKey = new URLSearchParams(
    Object.entries(resolvedSearchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : String(value ?? ""),
    ])
  ).toString();

  return (
    <>
      <div className="w-full px-4 md:px-8">
        <h1 className="text-2xl md:text-4xl mb-4 gradient-title-gold">تصفح السيارات</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-80 flex-shrink-0">
            {/* filters */}
            <CarFilters filters={filtersData} />
          </div>

          <div className="flex-1">
            {/* Listings MUST be wrapped in Suspense */}
            <Suspense key={listingsKey} fallback={<LoadingBar />}>
              <CarListings
                priceRange={filtersData?.data?.priceRange}
                searchParams={resolvedSearchParams}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* WhatsApp Button for Cars Page */}
      <CarsPageWrapper />
    </>
  );
};

export default CarsPage;
