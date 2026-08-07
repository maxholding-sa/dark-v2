import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "شركات وماركات السيارات",
  description: "استكشف ماركات وشركات السيارات المتوفرة لدى ماكس موتورز وابحث عن السيارة المناسبة حسب الشركة أو العلامة التجارية.",
  keywords: ["ماركات سيارات", "شركات السيارات", "تويوتا", "هيونداي", "نيسان", "كيا"],
  canonicalUrl: "/companies",
});

export default function CompaniesLayout({ children }) {
  return children;
}
