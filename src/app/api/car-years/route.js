import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { carTextEquals, normalizeCarText } from '@/lib/car-text';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = normalizeCarText(searchParams.get('make'));
    const model = normalizeCarText(searchParams.get('model'));

    const rows = await db.car.findMany({
      select: {
        make: true,
        model: true,
        year: true,
      },
      orderBy: {
        year: 'desc',
      },
    });

    // Match on the canonical key: the dropdowns send the cleaned spelling, and
    // stored values still carry stray spaces, so `where: { model }` would hide
    // whole model years (a 2025 trim disappearing behind its 2026 twin).
    let matches = rows.filter(
      (car) =>
        (!make || carTextEquals(car.make, make)) &&
        (!model || carTextEquals(car.model, model))
    );

    // Business rule: Kia K5 Astina is only offered as a 2023.
    const lowerModel = model.toLowerCase();
    if (make === 'كيا' && lowerModel.includes('k5') && lowerModel.includes('أستندر')) {
      matches = matches.filter((car) => car.year === 2023);
    }

    const uniqueYears = [
      ...new Set(matches.map((car) => car.year).filter(Boolean).map(String)),
    ];

    return NextResponse.json({ years: uniqueYears });
  } catch (error) {
    console.error('Error fetching car years:', error);
    return NextResponse.json({ years: [] });
  }
}
