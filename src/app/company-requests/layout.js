import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "طلبات الشركات | حلول سيارات للشركات",
  description: "اطلب حلول سيارات مخصصة للشركات والمؤسسات من ماكس موتورز، مع أسطول متنوع وعروض خاصة وخدمة مباشرة عبر واتساب.",
  keywords: ["سيارات شركات", "عروض سيارات للشركات", "أسطول سيارات", "طلبات الشركات"],
  canonicalUrl: "/company-requests",
});

export default function CompanyRequestsLayout({ children }) {
  return children;
}
