"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import FeaturedBrandCard from "@/components/FeaturedBrandCard";
import { getFeaturedBrands } from "@/actions/featured-brands";

export default function CompaniesPage() {
  const [featuredBrands, setFeaturedBrands] = useState([]);
  const [isBrandsLoading, setIsBrandsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBrands = async () => {
      try {
        setIsBrandsLoading(true);
        const result = await getFeaturedBrands();
        if (result?.success && result?.data) {
          setFeaturedBrands(result.data);
        }
      } catch (error) {
        console.error("Error fetching featured brands:", error);
      } finally {
        setIsBrandsLoading(false);
      }
    };

    fetchFeaturedBrands();
  }, []);

  return (
    <div className="pt-30 min-h-screen flex flex-col bg-black">
      {/* Header Section */}
      <section className="py-12 px-6 md:px-12">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            الشركات المميزة
          </h1>
          <p className="text-gold text-base max-w-2xl mx-auto">
            استكشف جميع الشركات المشهورة والموثوقة المتوفرة على منصتنا
          </p>
        </div>
      </section>

      {/* Companies Grid Section */}
      <section className="py-6 px-6 md:px-12 flex-grow">
        <div className="container mx-auto">
          {isBrandsLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md shadow-xl p-4 animate-pulse h-32"
                >
                  <div className="h-full bg-gray-200/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : featuredBrands?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredBrands.map((brand) => {
                return <FeaturedBrandCard key={brand.id} brand={brand} />;
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-xl">
                لا توجد علامات تجارية متاحة حالياً
              </p>
              <Button variant="outline" className="mt-6" asChild>
                <Link href="/">العودة إلى الرئيسية</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
