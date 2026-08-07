import { notFound } from "next/navigation";
import { getAboutPage } from "@/actions/site-management";
import AboutPageContent from "./_components/AboutPageContent";
import { generateMetadata as buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const result = await getAboutPage();
  const page = result.data;

  if (!page?.isPublished) {
    return buildMetadata({
      title: "من نحن",
      description: "تعرف على ماكس موتورز وخدماتها في بيع السيارات، تجربة القيادة، والتمويل في السعودية.",
      canonicalUrl: "/about",
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.metaDescription || "تعرف على ماكس موتورز وخدماتها في بيع السيارات، تجربة القيادة، والتمويل في السعودية.",
    keywords: page.metaKeywords ? page.metaKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean) : ["ماكس موتورز", "من نحن", "سيارات السعودية"],
    canonicalUrl: "/about",
  });
}

export default async function AboutPage() {
  const result = await getAboutPage();

  if (!result.success || !result.data) {
    notFound();
  }

  if (!result.data.isPublished) {
    notFound();
  }

  return <AboutPageContent page={result.data} />;
}
