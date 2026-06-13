import { NextResponse } from "next/server";
import { getCarFilters } from "@/actions/car-listing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getCarFilters();
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/cars/filters:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
