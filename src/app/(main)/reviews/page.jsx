import ReviewCard from "@/components/ReviewCard";
import { db } from "@/lib/prisma";
import { generateMetadata } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = 'force-dynamic';

export const metadata = generateMetadata({
  title: "آراء العملاء",
  description: "اقرأ آراء وتجارب عملاء ماكس موتورز مع شراء السيارات، تجربة القيادة، وخدمات التمويل.",
  keywords: ["آراء العملاء", "تقييم ماكس موتورز", "تجارب شراء السيارات"],
  canonicalUrl: "/reviews",
});

const getCachedReviews = unstable_cache(
  async (search = "") => {
    try {
      let where = {};
      if (search) {
        where.OR = [
          { clientName: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { car: { contains: search, mode: "insensitive" } },
          { reviewText: { contains: search, mode: "insensitive" } },
        ];
      }

      const reviews = await db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },
  ["all-reviews"],
  { revalidate: 3600, tags: ["reviews"] }
);

export default async function ReviewsPage({ searchParams }) {
  const { search = "" } = await searchParams;
  const reviews = await getCachedReviews(search);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="py-12 px-6 md:px-12">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            آراء العملاء
          </h1>
          <p className="text-yellow-600 text-base max-w-2xl mx-auto">
            اقرأ تجارب العملاء الحقيقية والتقييمات الصادقة لخدماتنا
          </p>
        </div>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-400">
            لا توجد آراء حالياً
          </div>
        )}
      </div>
    </div>
  );
}
