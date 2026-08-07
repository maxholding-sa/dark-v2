import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { carTextEquals, normalizeCarText, NO_CATEGORY_VALUE } from '@/lib/car-text';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = normalizeCarText(searchParams.get('make'));
    const model = normalizeCarText(searchParams.get('model'));
    const year = searchParams.get('year');
    const category = normalizeCarText(searchParams.get('category'));

    if (!make || !model || !year) {
      return NextResponse.json(
        { success: false, message: 'معايير البحث الأساسية مطلوبة (الماركة، الموديل، السنة)' },
        { status: 400 }
      );
    }

    // Year is a real column, so it can still be filtered in SQL. Make / model /
    // category come back from the dropdowns already cleaned, so they have to be
    // compared on the canonical key or every row stored with a stray space
    // becomes unreachable — which is what made the wizard dead-end here.
    const candidates = await db.car.findMany({
      where: { year: parseInt(year, 10) },
    });

    const wantsUncategorized = category === NO_CATEGORY_VALUE;
    const matches = candidates.filter((car) => {
      if (!carTextEquals(car.make, make) || !carTextEquals(car.model, model)) return false;
      if (wantsUncategorized) return !normalizeCarText(car.category);
      return !category || carTextEquals(car.category, category);
    });

    // Prefer a priced row: an unpriced twin cannot produce financing offers.
    const car = matches.find((c) => Number(c.price) > 0) || matches[0];

    if (!car) {
      return NextResponse.json(
        { success: false, message: 'لم يتم العثور على سيارة بهذه المواصفات' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: car,
    });

  } catch (error) {
    console.error('Error searching car:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في البحث عن السيارة' },
      { status: 500 }
    );
  }
}
