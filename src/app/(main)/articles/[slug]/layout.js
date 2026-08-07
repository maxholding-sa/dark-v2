import { db } from "@/lib/prisma";
import { generateJsonLd, generateMetadata as buildMetadata, SITE_CONFIG, truncate } from "@/lib/seo";

async function getArticle(slug) {
  try {
    return await db.article.findFirst({
      where: {
        slug,
        published: true,
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[article metadata] fetch failed:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return buildMetadata({
      title: "المقال غير موجود",
      description: "لم يتم العثور على المقال المطلوب.",
      canonicalUrl: `/articles/${slug}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  return buildMetadata({
    title: article.title,
    description: truncate(article.excerpt || article.content, 160),
    keywords: article.tags || [],
    ogImage: article.image || SITE_CONFIG.defaultOgImage,
    canonicalUrl: `/articles/${article.slug}`,
    ogType: "article",
  });
}

export default async function ArticleDetailLayout({ children, params }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) return children;

  return (
    <>
      <script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateJsonLd("article", {
            title: article.title,
            description: truncate(article.excerpt || article.content, 160),
            image: article.image ? (article.image.startsWith("http") ? article.image : `${SITE_CONFIG.url}${article.image}`) : `${SITE_CONFIG.url}${SITE_CONFIG.defaultOgImage}`,
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt?.toISOString(),
            author: article.author?.name,
            url: `${SITE_CONFIG.url}/articles/${article.slug}`,
          })),
        }}
      />
      {children}
    </>
  );
}
