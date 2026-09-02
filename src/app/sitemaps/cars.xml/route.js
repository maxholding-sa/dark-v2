import { db } from "@/lib/prisma";
import { getBaseUrl, renderUrlSet, buildXmlResponse } from "@/lib/sitemap-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = getBaseUrl();

  try {
    const cars = await db.car.findMany({
      where: {
        status: "AVAILABLE",
      },
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

    // If no cars found, include main cars listing
    if (carUrls.length === 0) {
      carUrls.push({
        loc: `${baseUrl}/cars`,
        lastmod: new Date(),
        changefreq: "daily",
        priority: "0.95",
      });
    }

    const xml = renderUrlSet(carUrls);
    return buildXmlResponse(xml, { sMaxAge: 3600, staleWhileRevalidate: 86400 });
  } catch (error) {
    console.error("Cars sitemap generation error:", error);

    const fallbackXml = renderUrlSet([
      {
        loc: `${baseUrl}/cars`,
        lastmod: new Date(),
        changefreq: "daily",
        priority: "0.95",
      },
    ]);

    return buildXmlResponse(fallbackXml, { sMaxAge: 300, staleWhileRevalidate: 3600 });
  }
}
