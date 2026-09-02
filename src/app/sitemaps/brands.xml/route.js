import { db } from "@/lib/prisma";
import { getBaseUrl, renderUrlSet, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = getBaseUrl();

  try {
    const [brands, models, banks] = await Promise.all([
      db.featuredBrand.findMany({
        where: { isActive: true },
        select: { name: true, nameAr: true, image: true, updatedAt: true },
        orderBy: { order: "asc" },
      }),
      db.featuredModel.findMany({
        where: { isActive: true },
        select: { name: true, nameAr: true, image: true, updatedAt: true },
        orderBy: { order: "asc" },
      }),
      db.bank.findMany({
        select: { id: true, name: true, logoImage: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const urls = [
      {
        loc: `${baseUrl}/companies`,
        lastmod: brands[0]?.updatedAt || new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
      {
        loc: `${baseUrl}/featured-models`,
        lastmod: models[0]?.updatedAt || new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
      {
        loc: `${baseUrl}/banks`,
        lastmod: banks[0]?.updatedAt || new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
      ...brands.map((brand) => ({
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
      })),
    ];

    const xml = renderUrlSet(urls);
    return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
  } catch (error) {
    console.error("Brands sitemap generation error:", error);

    const fallbackXml = renderUrlSet([
      {
        loc: `${baseUrl}/companies`,
        lastmod: new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
      {
        loc: `${baseUrl}/featured-models`,
        lastmod: new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
      {
        loc: `${baseUrl}/banks`,
        lastmod: new Date(),
        changefreq: "weekly",
        priority: "0.8",
      },
    ]);

    return buildXmlResponse(fallbackXml, { sMaxAge: 300, staleWhileRevalidate: 3600 });
  }
}
