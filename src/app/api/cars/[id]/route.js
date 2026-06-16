import { NextResponse } from "next/server";
import { getCarById } from "@/actions/car-details";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const result = await getCarById(id);

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.message || "Car not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("GET /api/cars/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
