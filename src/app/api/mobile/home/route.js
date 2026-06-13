import { NextResponse } from "next/server";
import { getFeaturedCars } from "@/actions/home";
import { getFeaturedBrands } from "@/actions/featured-brands";
import { getFeaturedModels } from "@/actions/featured-models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cars, brands, models] = await Promise.all([
      getFeaturedCars(10),
      getFeaturedBrands(),
      getFeaturedModels(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        featuredCars: cars.data ?? [],
        brands: brands.data ?? [],
        models: models.data ?? [],
      },
    });
  } catch (error) {
    console.error("GET /api/mobile/home:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
