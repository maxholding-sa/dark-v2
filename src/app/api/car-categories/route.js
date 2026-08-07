import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import {
  carTextEquals,
  dedupeCarTexts,
  normalizeCarText,
  NO_CATEGORY_VALUE,
} from '@/lib/car-text';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = normalizeCarText(searchParams.get('make'));
    const model = normalizeCarText(searchParams.get('model'));
    const year = searchParams.get('year');

    if (!make || !model) {
      return NextResponse.json({ categories: [], years: [] });
    }

    const rows = await db.car.findMany({
      select: {
        make: true,
        model: true,
        category: true,
        year: true,
      },
      orderBy: [{ category: 'asc' }, { year: 'desc' }],
    });

    const parsedYear = year ? parseInt(year, 10) : null;
    const matches = rows.filter(
      (car) =>
        carTextEquals(car.make, make) &&
        carTextEquals(car.model, model) &&
        (parsedYear == null || car.year === parsedYear)
    );

    // Trims are typed by hand, so the same one is stored as "GLX" and "GLX ".
    // Collapsing them here is what stops the dropdown listing the trim twice.
    const categories = dedupeCarTexts(matches.map((car) => car.category));

    // Some rows carry no trim at all. Without an entry for them those cars are
    // unreachable once any sibling row has a trim — the customer sees a trim
    // list that silently omits part of the inventory.
    if (categories.length && matches.some((car) => !normalizeCarText(car.category))) {
      categories.push(NO_CATEGORY_VALUE);
    }

    const years = [
      ...new Set(matches.map((car) => car.year).filter(Boolean).map(String)),
    ];

    return NextResponse.json({ categories, years });
  } catch (error) {
    console.error('Error fetching car categories:', error);
    return NextResponse.json({ categories: [], years: [] });
  }
}
