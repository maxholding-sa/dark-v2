import { NextResponse } from "next/server";
import { getCarsByFilters } from "@/actions/car-listing";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const result = await getCarsByFilters({
      search: searchParams.get("search") || "",
      make: searchParams.get("make") || "",
      bodyType: searchParams.get("bodyType") || "",
      fuelType: searchParams.get("fuelType") || "",
      transmission: searchParams.get("transmission") || "",
      minPrice: minPrice != null ? parseFloat(minPrice) : 0,
      maxPrice:
        maxPrice != null ? parseFloat(maxPrice) : Number.MAX_SAFE_INTEGER,
      sortBy: searchParams.get("sortBy") || "newest",
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "10", 10),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/cars:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
