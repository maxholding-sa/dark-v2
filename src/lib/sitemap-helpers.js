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
      "X-Robots-Tag": "noindex, follow",
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
      const lastmod = item.lastmod ? `    <lastmod>${formatDate(item.lastmod)}</lastmod>\n` : "";
      return `  <sitemap>\n    <loc>${loc}</loc>\n${lastmod}  </sitemap>`;
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
          .slice(0, 10) // Google sitemap allows up to 1,000 images per URL, 10 is optimal for speed
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
