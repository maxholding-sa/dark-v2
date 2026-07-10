import { NextResponse } from "next/server";
import { getCarFilters, getDynamicCarFilters } from "@/actions/car-listing";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get("make") || "";
    const bodyType = searchParams.get("bodyType") || "";
    const fuelType = searchParams.get("fuelType") || "";
    const transmission = searchParams.get("transmission") || "";

    const hasSelections = make || bodyType || fuelType || transmission;

    const result = hasSelections
      ? await getDynamicCarFilters({ make, bodyType, fuelType, transmission })
      : await getCarFilters();

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/cars/filters:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
