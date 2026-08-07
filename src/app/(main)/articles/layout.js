import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "مقالات السيارات",
  description: "اقرأ مقالات ماكس موتورز عن شراء السيارات، الصيانة، التمويل، وتجربة القيادة لمساعدتك على اختيار سيارتك بثقة.",
  keywords: ["مقالات سيارات", "نصائح شراء سيارة", "صيانة السيارات", "تمويل السيارات"],
  canonicalUrl: "/articles",
});

export default function ArticlesLayout({ children }) {
  return children;
}
