import { getCarFilters } from "@/actions/car-listing";
import React, { Suspense } from "react";
import LoadingBar from "@/components/LoadingBar";
import CarFilters from "./_components/CarFilters";
import CarListings from "./_components/CarListings";
import CarsPageWrapper from "./_components/CarsPageWrapper";
import { generateMetadata, SAUDI_MARKET_KEYWORDS, SITE_CONFIG } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "تصفح وشراء السيارات في السعودية | ماكس موتورز",
  description: "اكتشف آلاف السيارات الجديدة والمستعملة بأفضل الأسعار في السعودية. اختر من تويوتا، هيونداي، نيسان وغيرها. توفير وتمويل متاح.",
  keywords: [
    "سيارات للبيع السعودية",
    "شراء سيارة مستعملة",
    "سيارات جديدة الرياض",
    "أسعار السيارات",
    ...SAUDI_MARKET_KEYWORDS.brands,
  ],
  canonicalUrl: `${SITE_CONFIG.url}/cars`,
  ogType: "website",
});

export const dynamic = "force-dynamic";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const CarsPage = async () => {
  const filtersData = await getCarFilters();

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
            <Suspense fallback={<LoadingBar />}>
              <CarListings priceRange={filtersData?.data?.priceRange} />
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
