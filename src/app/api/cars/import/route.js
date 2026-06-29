import { NextResponse } from "next/server";
import { compareCarImport, applyCarImport } from "@/actions/cars";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, rows, toUpdate } = body;

    if (action === "compare") {
      if (!Array.isArray(rows)) {
        return NextResponse.json(
          { success: false, error: "rows required" },
          { status: 400 }
        );
      }
      const result = await compareCarImport(rows);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "apply") {
      if (!Array.isArray(toUpdate)) {
        return NextResponse.json(
          { success: false, error: "toUpdate required" },
          { status: 400 }
        );
      }
      const result = await applyCarImport(toUpdate);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/cars/import:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
