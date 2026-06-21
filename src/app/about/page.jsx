import { notFound } from "next/navigation";
import { getAboutPage } from "@/actions/site-management";
import AboutPageContent from "./_components/AboutPageContent";

export async function generateMetadata() {
  const result = await getAboutPage();
  const page = result.data;

  if (!page?.isPublished) {
    return { title: "من نحن" };
  }

  return {
    title: page.title,
    description: page.metaDescription || undefined,
    keywords: page.metaKeywords || undefined,
  };
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
