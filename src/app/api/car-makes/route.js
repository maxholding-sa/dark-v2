import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { aggregateInventorySegmentsByMake } from '@/lib/brand-segment';
import { dedupeCarTexts } from '@/lib/car-text';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const withSegments = searchParams.get('withSegments') === '1';

    const whereClause = {};
    if (year) {
      whereClause.year = parseInt(year);
    }

    const makes = await db.car.findMany({
      where: whereClause,
      select: {
        make: true,
      },
      distinct: ['make'],
      orderBy: {
        make: 'asc',
      },
    });

    // `distinct` is byte-exact, so two spellings of one make still slip
    // through — collapse them so the dropdown never repeats an entry.
    const uniqueMakes = dedupeCarTexts(makes.map(car => car.make));

    if (!withSegments) {
      return NextResponse.json({ makes: uniqueMakes });
    }

    const cars = await db.car.findMany({
      where: whereClause,
      select: {
        make: true,
        insuranceSegment: true,
      },
    });

    return NextResponse.json({
      makes: uniqueMakes,
      segmentHints: aggregateInventorySegmentsByMake(cars),
    });
  } catch (error) {
    console.error('Error fetching car makes:', error);
    return NextResponse.json({ makes: [], segmentHints: {} });
  }
}
