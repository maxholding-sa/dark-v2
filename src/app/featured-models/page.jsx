import Link from "next/link";
import { Button } from "@/components/ui/button";
import FeaturedModelCard from "@/components/FeaturedModelCard";
import { getFeaturedModels } from "@/actions/featured-models";
import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "الموديلات المميزة",
  description: "تصفح جميع فئات وموديلات السيارات المميزة على منصة ماكس موتورز",
  keywords: ["موديلات السيارات", "فئات السيارات", "سيارات SUV", "سيارات سيدان", "سيارات تجارية"],
  canonicalUrl: "/featured-models",
});

export default async function FeaturedModelsPage() {
  const res = await getFeaturedModels();
  const models = res?.success && res?.data ? res.data : [];

  return (
    <div className="pt-20 pb-12 min-h-screen flex flex-col bg-black">
      <section className="py-12 px-6 md:px-12">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            الموديلات المميزة
          </h1>
          <p className="text-yellow-600 text-base max-w-2xl mx-auto">
            استكشف جميع فئات السيارات وتصفح المركبات حسب نوع الهيكل
          </p>
        </div>
      </section>

      <section className="py-6 px-6 md:px-12 flex-grow">
        <div className="container mx-auto max-w-7xl">
          {models.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-xl">
                لا توجد موديلات متاحة حالياً
              </p>
              <Button variant="outline" className="mt-6" asChild>
                <Link href="/">العودة إلى الرئيسية</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {models.map((model) => (
                <FeaturedModelCard key={model.id} model={model} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
