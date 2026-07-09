import { db } from "@/lib/prisma";
import { SITE_CONFIG } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const sitemapUrl = ({ loc, lastmod = new Date(), changefreq = "weekly", priority = "0.7" }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export async function GET() {
  try {
    const baseUrl = SITE_CONFIG.url;

    const [cars, articles] = await Promise.all([
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
      }),
      db.article.findMany({
        where: {
          published: true,
        },
        select: {
          slug: true,
          updatedAt: true,
          publishedAt: true,
        },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    const staticPages = [
      { path: "/", changefreq: "daily", priority: "1.0" },
      { path: "/cars", changefreq: "daily", priority: "0.95" },
      { path: "/about", changefreq: "monthly", priority: "0.75" },
      { path: "/contact", changefreq: "monthly", priority: "0.7" },
      { path: "/banks", changefreq: "weekly", priority: "0.8" },
      { path: "/companies", changefreq: "weekly", priority: "0.75" },
      { path: "/featured-models", changefreq: "weekly", priority: "0.75" },
      { path: "/articles", changefreq: "weekly", priority: "0.75" },
      { path: "/reviews", changefreq: "weekly", priority: "0.65" },
      { path: "/company-requests", changefreq: "monthly", priority: "0.6" },
    ];

    const urls = [
      ...staticPages.map((page) =>
        sitemapUrl({
          loc: `${baseUrl}${page.path}`,
          changefreq: page.changefreq,
          priority: page.priority,
        })
      ),
      ...cars.map((car) =>
        sitemapUrl({
          loc: `${baseUrl}/cars/${car.id}`,
          lastmod: car.updatedAt,
          changefreq: "weekly",
          priority: "0.85",
        })
      ),
      ...articles.map((article) =>
        sitemapUrl({
          loc: `${baseUrl}/articles/${article.slug}`,
          lastmod: article.publishedAt || article.updatedAt,
          changefreq: "monthly",
          priority: "0.7",
        })
      ),
    ];

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xmlContent, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);

    const fallbackPages = ["/", "/cars", "/about", "/contact", "/banks", "/companies", "/featured-models", "/articles"]
      .map((path) => sitemapUrl({ loc: `${SITE_CONFIG.url}${path}` }))
      .join("\n");

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${fallbackPages}
</urlset>`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
        status: 200,
      }
    );
  }
}
