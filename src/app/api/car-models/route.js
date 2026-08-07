import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { dedupeCarTexts, carTextEquals, normalizeCarText } from '@/lib/car-text';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = normalizeCarText(searchParams.get('make'));

    if (!make) {
      return NextResponse.json({ models: [] });
    }

    // The make handed back by the dropdown is the *cleaned* spelling, so a
    // byte-exact `where` silently drops rows still stored with a trailing space
    // or a different hamza. The make/model column pair is small — match it on
    // the canonical key instead.
    const rows = await db.car.findMany({
      select: {
        make: true,
        model: true,
      },
      orderBy: {
        model: 'asc',
      },
    });

    const models = dedupeCarTexts(
      rows.filter((car) => carTextEquals(car.make, make)).map((car) => car.model)
    );

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching car models:', error);
    return NextResponse.json({ models: [] });
  }
}
