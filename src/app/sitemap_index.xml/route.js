import { db } from "@/lib/prisma";
import { getBaseUrl, renderSitemapIndex, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = getBaseUrl();
  const now = new Date();

  try {
    const [latestCar, latestArticle, latestBrand] = await Promise.all([
      db.car.findFirst({
        where: { status: "AVAILABLE" },
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }).catch(() => null),
      db.article.findFirst({
        where: { published: true },
        select: { publishedAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }).catch(() => null),
      db.featuredBrand.findFirst({
        where: { isActive: true },
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }).catch(() => null),
    ]);

    const sitemaps = [
      {
        loc: `${baseUrl}/sitemaps/pages.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemaps/cars.xml`,
        lastmod: latestCar?.updatedAt || now,
      },
      {
        loc: `${baseUrl}/sitemaps/articles.xml`,
        lastmod: latestArticle?.publishedAt || latestArticle?.updatedAt || now,
      },
      {
        loc: `${baseUrl}/sitemaps/brands.xml`,
        lastmod: latestBrand?.updatedAt || now,
      },
    ];

    const xml = renderSitemapIndex(sitemaps);
    return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
  } catch (error) {
    console.error("Sitemap index generation error:", error);

    const fallbackSitemaps = [
      { loc: `${baseUrl}/sitemaps/pages.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/cars.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/articles.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/brands.xml`, lastmod: now },
    ];

    const xml = renderSitemapIndex(fallbackSitemaps);
    return buildXmlResponse(xml, { sMaxAge: 300, staleWhileRevalidate: 3600 });
  }
}
