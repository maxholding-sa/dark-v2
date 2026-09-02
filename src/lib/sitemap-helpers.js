import { db } from "@/lib/prisma";
import { SITE_CONFIG } from "@/lib/seo";

/**
 * Escapes characters that are reserved in XML.
 */
export const escapeXml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * Safely converts a date or timestamp to an ISO 8601 string.
 */
export const formatDate = (date) => {
  try {
    if (!date) return new Date().toISOString();
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/**
 * Standard HTTP XML Response with SEO and caching headers.
 */
export const buildXmlResponse = (
  xmlContent,
  {
    status = 200,
    sMaxAge = 3600,
    staleWhileRevalidate = 86400,
  } = {}
) => {
  return new Response(xmlContent, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
};

/**
 * Renders a Google-compliant <sitemapindex> document.
 */
export const renderSitemapIndex = (sitemaps = []) => {
  const sitemapEntries = sitemaps
    .map((item) => {
      const loc = escapeXml(item.loc);
      const lastmod = item.lastmod ? `\n    <lastmod>${formatDate(item.lastmod)}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${loc}</loc>${lastmod}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
};

/**
 * Renders a Google-compliant <urlset> with image sitemap extension support.
 */
export const renderUrlSet = (urls = []) => {
  const urlEntries = urls
    .map((item) => {
      const loc = escapeXml(item.loc);
      const lastmod = item.lastmod ? `\n    <lastmod>${formatDate(item.lastmod)}</lastmod>` : "";
      const changefreq = item.changefreq ? `\n    <changefreq>${escapeXml(item.changefreq)}</changefreq>` : "";
      const priority = item.priority ? `\n    <priority>${escapeXml(item.priority)}</priority>` : "";

      let imagesXml = "";
      if (Array.isArray(item.images) && item.images.length > 0) {
        imagesXml = item.images
          .filter((img) => img && (typeof img === "string" || img.loc))
          .slice(0, 10)
          .map((img) => {
            const imgLoc = escapeXml(typeof img === "string" ? img : img.loc);
            const titleXml = img.title ? `\n      <image:title>${escapeXml(img.title)}</image:title>` : "";
            const captionXml = img.caption ? `\n      <image:caption>${escapeXml(img.caption)}</image:caption>` : "";
            return `\n    <image:image>\n      <image:loc>${imgLoc}</image:loc>${titleXml}${captionXml}\n    </image:image>`;
          })
          .join("");
      }

      return `  <url>\n    <loc>${loc}</loc>${lastmod}${changefreq}${priority}${imagesXml}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
};

export const getBaseUrl = () => {
  return SITE_CONFIG.url || "https://maxmotors.sa";
};

/**
 * Master Sitemap Index Generator
 */
export async function generateSitemapIndexResponse() {
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
      { loc: `${baseUrl}/sitemaps/pages.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/cars.xml`, lastmod: latestCar?.updatedAt || now },
      { loc: `${baseUrl}/sitemaps/articles.xml`, lastmod: latestArticle?.publishedAt || latestArticle?.updatedAt || now },
      { loc: `${baseUrl}/sitemaps/brands.xml`, lastmod: latestBrand?.updatedAt || now },
    ];

    return buildXmlResponse(renderSitemapIndex(sitemaps));
  } catch (error) {
    console.error("Sitemap index generation error:", error);
    const fallbackSitemaps = [
      { loc: `${baseUrl}/sitemaps/pages.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/cars.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/articles.xml`, lastmod: now },
      { loc: `${baseUrl}/sitemaps/brands.xml`, lastmod: now },
    ];
    return buildXmlResponse(renderSitemapIndex(fallbackSitemaps), { sMaxAge: 300 });
  }
}

/**
 * Pages Sitemap Generator
 */
export async function generatePagesSitemapResponse() {
  const baseUrl = getBaseUrl();
  const now = new Date();

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

  return buildXmlResponse(renderUrlSet(staticPages));
}

/**
 * Cars Sitemap Generator
 */
export async function generateCarsSitemapResponse() {
  const baseUrl = getBaseUrl();

  try {
    const cars = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        images: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const carUrls = cars.map((car) => {
      const carTitle = `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim();
      const images = (Array.isArray(car.images) ? car.images : [])
        .filter(Boolean)
        .map((img) => ({
          loc: img,
          title: carTitle || "سيارة للبيع",
          caption: carTitle ? `${carTitle} للبيع لدى ماكس موتورز` : "سيارة للبيع لدى ماكس موتورز",
        }));

      return {
        loc: `${baseUrl}/cars/${car.id}`,
        lastmod: car.updatedAt,
        changefreq: "weekly",
        priority: "0.9",
        images,
      };
    });

    if (carUrls.length === 0) {
      carUrls.push({
        loc: `${baseUrl}/cars`,
        lastmod: new Date(),
        changefreq: "daily",
        priority: "0.95",
      });
    }

    return buildXmlResponse(renderUrlSet(carUrls));
  } catch (error) {
    console.error("Cars sitemap generation error:", error);
    const fallbackXml = renderUrlSet([
      { loc: `${baseUrl}/cars`, lastmod: new Date(), changefreq: "daily", priority: "0.95" },
    ]);
    return buildXmlResponse(fallbackXml, { sMaxAge: 300 });
  }
}

/**
 * Articles Sitemap Generator
 */
export async function generateArticlesSitemapResponse() {
  const baseUrl = getBaseUrl();

  try {
    const articles = await db.article.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        image: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    const articleUrls = articles.map((article) => {
      const images = article.image
        ? [
            {
              loc: article.image,
              title: article.title || "مقال ماكس موتورز",
              caption: article.excerpt || article.title || "مقال عن السيارات في السعودية",
            },
          ]
        : [];

      return {
        loc: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
        lastmod: article.publishedAt || article.updatedAt || new Date(),
        changefreq: "weekly",
        priority: "0.8",
        images,
      };
    });

    if (articleUrls.length === 0) {
      articleUrls.push({
        loc: `${baseUrl}/articles`,
        lastmod: new Date(),
        changefreq: "daily",
        priority: "0.85",
      });
    }

    return buildXmlResponse(renderUrlSet(articleUrls));
  } catch (error) {
    console.error("Articles sitemap generation error:", error);
    const fallbackXml = renderUrlSet([
      { loc: `${baseUrl}/articles`, lastmod: new Date(), changefreq: "daily", priority: "0.85" },
    ]);
    return buildXmlResponse(fallbackXml, { sMaxAge: 300 });
  }
}

/**
 * Brands Sitemap Generator
 */
export async function generateBrandsSitemapResponse() {
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
      { loc: `${baseUrl}/companies`, lastmod: brands[0]?.updatedAt || new Date(), changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/featured-models`, lastmod: models[0]?.updatedAt || new Date(), changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/banks`, lastmod: banks[0]?.updatedAt || new Date(), changefreq: "weekly", priority: "0.8" },
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

    return buildXmlResponse(renderUrlSet(urls));
  } catch (error) {
    console.error("Brands sitemap generation error:", error);
    const fallbackXml = renderUrlSet([
      { loc: `${baseUrl}/companies`, lastmod: new Date(), changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/featured-models`, lastmod: new Date(), changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/banks`, lastmod: new Date(), changefreq: "weekly", priority: "0.8" },
    ]);
    return buildXmlResponse(fallbackXml, { sMaxAge: 300 });
  }
}
