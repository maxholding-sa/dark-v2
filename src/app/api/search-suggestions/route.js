import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { buildPrismaCarSearchConditions } from "@/lib/car-search";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (query.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchConditions = buildPrismaCarSearchConditions(query);
    if (searchConditions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const cars = await db.car.findMany({
      where: {
        status: "AVAILABLE",
        AND: searchConditions,
      },
      select: {
        make: true,
        model: true,
        year: true,
        color: true,
      },
      orderBy: [
        { isLuxury: "desc" },
        { featured: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
    });

    const uniqueSuggestions = [
      ...new Set(
        cars.map((car) =>
          [car.make, car.model, car.year, car.color].filter(Boolean).join(" ")
        )
      ),
    ].slice(0, 8);

    return NextResponse.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}