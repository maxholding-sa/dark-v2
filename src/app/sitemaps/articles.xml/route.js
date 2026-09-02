import { db } from "@/lib/prisma";
import { getBaseUrl, renderUrlSet, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = getBaseUrl();

  try {
    const articles = await db.article.findMany({
      where: {
        published: true,
      },
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

    const xml = renderUrlSet(articleUrls);
    return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
  } catch (error) {
    console.error("Articles sitemap generation error:", error);

    const fallbackXml = renderUrlSet([
      {
        loc: `${baseUrl}/articles`,
        lastmod: new Date(),
        changefreq: "daily",
        priority: "0.85",
      },
    ]);

    return buildXmlResponse(fallbackXml, { sMaxAge: 300, staleWhileRevalidate: 3600 });
  }
}
