import { db } from "@/lib/prisma";
import { getBaseUrl, renderUrlSet, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = getBaseUrl();
  const now = new Date();

  try {
    const [cars, articles, brands] = await Promise.all([
      db.car.findMany({
        where: {
          status: "AVAILABLE",
        },
        select: {
          id: true,
          updatedAt: true,
          images: true,
          make: true,
          model: true,
          year: true,
        },
        orderBy: { updatedAt: "desc" },
      }).catch(() => []),
      db.article.findMany({
        where: {
          published: true,
        },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          image: true,
          updatedAt: true,
          publishedAt: true,
        },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      }).catch(() => []),
      db.featuredBrand.findMany({
        where: { isActive: true },
        select: { name: true, nameAr: true, image: true, updatedAt: true },
        orderBy: { order: "asc" },
      }).catch(() => []),
    ]);

    const staticPages = [
      { loc: `${baseUrl}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
      { loc: `${baseUrl}/cars`, lastmod: now, changefreq: "daily", priority: "0.95" },
      { loc: `${baseUrl}/loan-request`, lastmod: now, changefreq: "daily", priority: "0.9" },
      { loc: `${baseUrl}/banks`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/companies`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/featured-models`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/articles`, lastmod: now, changefreq: "daily", priority: "0.85" },
      { loc: `${baseUrl}/about`, lastmod: now, changefreq: "monthly", priority: "0.75" },
      { loc: `${baseUrl}/contact`, lastmod: now, changefreq: "monthly", priority: "0.75" },
      { loc: `${baseUrl}/reviews`, lastmod: now, changefreq: "weekly", priority: "0.7" },
      { loc: `${baseUrl}/company-requests`, lastmod: now, changefreq: "monthly", priority: "0.65" },
    ];

    const carUrls = cars.map((car) => {
      const title = `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim();
      const images = (Array.isArray(car.images) ? car.images : [])
        .filter(Boolean)
        .map((img) => ({
          loc: img,
          title: title || "سيارة للبيع",
          caption: title ? `${title} للبيع لدى ماكس موتورز` : "سيارة للبيع لدى ماكس موتورز",
        }));

      return {
        loc: `${baseUrl}/cars/${car.id}`,
        lastmod: car.updatedAt,
        changefreq: "weekly",
        priority: "0.9",
        images,
      };
    });

    const articleUrls = articles.map((article) => ({
      loc: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
      lastmod: article.publishedAt || article.updatedAt,
      changefreq: "weekly",
      priority: "0.8",
      images: article.image
        ? [
            {
              loc: article.image,
              title: article.title || "مقال ماكس موتورز",
              caption: article.excerpt || article.title || "مقال",
            },
          ]
        : [],
    }));

    const brandUrls = brands.map((brand) => ({
      loc: `${baseUrl}/cars?brand=${encodeURIComponent(brand.name)}`,
      lastmod: brand.updatedAt,
      changefreq: "weekly",
      priority: "0.75",
      images: brand.image
        ? [
            {
              loc: brand.image,
              title: `${brand.nameAr || brand.name} - ماكس موتورز`,
              caption: `سيارات ${brand.nameAr || brand.name} في السعودية`,
            },
          ]
        : [],
    }));

    const allUrls = [...staticPages, ...carUrls, ...articleUrls, ...brandUrls];
    const xml = renderUrlSet(allUrls);

    return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
  } catch (error) {
    console.error("Unified sitemap generation error:", error);

    const fallbackXml = renderUrlSet([
      { loc: `${baseUrl}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
      { loc: `${baseUrl}/cars`, lastmod: now, changefreq: "daily", priority: "0.95" },
      { loc: `${baseUrl}/about`, lastmod: now, changefreq: "monthly", priority: "0.75" },
      { loc: `${baseUrl}/contact`, lastmod: now, changefreq: "monthly", priority: "0.75" },
      { loc: `${baseUrl}/banks`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/companies`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/featured-models`, lastmod: now, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/articles`, lastmod: now, changefreq: "weekly", priority: "0.8" },
    ]);

    return buildXmlResponse(fallbackXml, { sMaxAge: 300, staleWhileRevalidate: 3600 });
  }
}
