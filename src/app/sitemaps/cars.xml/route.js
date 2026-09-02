import { generateCarsSitemapResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  return generateCarsSitemapResponse();
}
