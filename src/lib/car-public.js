/**
 * Public, user-independent reads for /cars/[id].
 *
 * The page used to call `getCarById`, which starts with `getAuthenticatedUser()`.
 * Reading auth cookies opts the whole route into dynamic rendering, so every car
 * page — ~300 of the 309 URLs in the sitemap — was re-queried from the database on
 * every request and served `Cache-Control: no-store`. Googlebot throttles crawling
 * on slow responses, which is what stalled indexing.
 *
 * Everything here is the same for every visitor, so it is cached and the route can
 * be statically rendered. The two per-user affordances (saved-car flag and the
 * visitor's own test-drive booking) are hydrated client-side from
 * /api/cars/[id]/user-state instead.
 *
 * Not a "use server" module on purpose: Server Action files may only export async
 * functions, which rules out exporting `unstable_cache` results directly.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/lib/prisma";
import { serializedCarsData } from "@/lib/helper";
import { carDisplayPriorityOrderBy } from "@/lib/data";

/** Matches `export const revalidate` on the car page. */
export const CAR_PAGE_REVALIDATE = 3600;

const serializeDealership = (dealership) =>
  dealership
    ? {
        ...dealership,
        createdAt: dealership.createdAt.toISOString(),
        updatedAt: dealership.updatedAt.toISOString(),
        workingHours: dealership.workingHours.map((hour) => ({
          ...hour,
          createdAt: hour.createdAt.toISOString(),
          updatedAt: hour.updatedAt.toISOString(),
        })),
      }
    : null;

async function fetchPublicCar(carId) {
  const car = await db.car.findUnique({ where: { id: carId } });

  if (!car) return { success: false, message: "Car not found" };

  // Independent queries — run together rather than in series, which is where most
  // of the old ~1.9s server time went.
  const [dealership, existingBookings] = await Promise.all([
    db.DealershipInfo.findFirst({ include: { workingHours: true } }),
    db.TestDriveBooking.findMany({
      where: { carId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { bookingDate: true, startTime: true, endTime: true },
    }),
  ]);

  return {
    success: true,
    data: {
      // `false` is the signed-out default; the client corrects it after hydration.
      ...serializedCarsData(car, false),
      testDriveInfo: {
        userTestDrive: null,
        dealership: serializeDealership(dealership),
        existingBookings: existingBookings.map((booking) => ({
          date: booking.bookingDate.toISOString().split("T")[0],
          startTime: booking.startTime,
          endTime: booking.endTime,
        })),
      },
    },
  };
}

async function fetchSimilarCars(carId, limit) {
  const currentCar = await db.car.findUnique({
    where: { id: carId },
    select: { id: true, make: true, bodyType: true, category: true },
  });

  if (!currentCar) return { success: false, data: [] };

  const similarConditions = [
    currentCar.category ? { category: currentCar.category } : null,
    currentCar.bodyType ? { bodyType: currentCar.bodyType } : null,
    currentCar.make ? { make: currentCar.make } : null,
  ].filter(Boolean);

  if (!similarConditions.length) return { success: true, data: [] };

  const cars = await db.car.findMany({
    where: { id: { not: carId }, status: "AVAILABLE", OR: similarConditions },
    take: limit,
    orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
  });

  return { success: true, data: cars.map((car) => serializedCarsData(car)) };
}

/**
 * `unstable_cache` keys on the arguments passed to the wrapped function, so the id
 * is threaded through rather than closed over — a closure would collapse every car
 * onto one cache entry.
 */
const cachedPublicCar = unstable_cache(
  async (carId) => fetchPublicCar(carId),
  ["public-car"],
  { revalidate: CAR_PAGE_REVALIDATE, tags: ["cars"] }
);

const cachedSimilarCars = unstable_cache(
  async (carId, limit) => fetchSimilarCars(carId, limit),
  ["public-similar-cars"],
  { revalidate: CAR_PAGE_REVALIDATE, tags: ["cars"] }
);

/** Falls back to an uncached read so a cache-layer failure degrades to slow, not broken. */
export async function getPublicCarById(carId) {
  try {
    return await cachedPublicCar(carId);
  } catch (error) {
    console.warn("[getPublicCarById] cached read failed:", error.message);
    try {
      return await fetchPublicCar(carId);
    } catch (innerError) {
      console.error("[getPublicCarById] failed:", innerError.message);
      return { success: false, message: "Car not found" };
    }
  }
}

export async function getPublicSimilarCars(carId, limit = 4) {
  try {
    return await cachedSimilarCars(carId, limit);
  } catch (error) {
    console.warn("[getPublicSimilarCars] failed:", error.message);
    return { success: false, data: [] };
  }
}

/** Ids worth prerendering at build time: the cars a crawler can actually reach. */
export async function getIndexableCarIds(limit = 500) {
  try {
    const cars = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: { id: true },
      take: limit,
      orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
    });
    return cars.map((car) => car.id);
  } catch (error) {
    console.warn("[getIndexableCarIds] failed:", error.message);
    return [];
  }
}
