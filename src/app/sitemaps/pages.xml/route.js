import { getBaseUrl, renderUrlSet, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
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

  const xml = renderUrlSet(staticPages);
  return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
}
