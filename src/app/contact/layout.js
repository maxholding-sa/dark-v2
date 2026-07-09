import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "تواصل مع ماكس موتورز",
  description: "تواصل مع فريق ماكس موتورز للاستفسار عن السيارات، حجز تجربة قيادة، عروض التمويل، وخدمات ما بعد البيع في السعودية.",
  keywords: ["تواصل ماكس موتورز", "رقم ماكس موتورز", "معرض سيارات السعودية", "حجز تجربة قيادة"],
  canonicalUrl: "/contact",
});

export default function ContactLayout({ children }) {
  return children;
}
