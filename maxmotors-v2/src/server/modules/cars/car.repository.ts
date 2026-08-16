import "server-only";

import type { Car, Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import { toSkipTake, type PageParams } from "@/lib/pagination";
import { buildSpellingVariants, tokenizeQuery } from "@/lib/search-text";
import { dedupeCarTexts } from "@/lib/car-text";
import type { CarQuery, CarSortOption } from "./car.schema";

/**
 * Database access for cars. Queries only — no authorisation, no business rules,
 * no formatting. Everything here returns raw Prisma rows; mapping to DTOs is
 * the service's job.
 *
 * Keeping this layer thin is what makes the service unit-testable: a test
 * substitutes a fake repository and never needs a database.
 */

const SORT_CLAUSES: Record<CarSortOption, Prisma.CarOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  priceAsc: { price: "asc" },
  priceDesc: { price: "desc" },
  mileageAsc: { mileage: "asc" },
  yearDesc: { year: "desc" },
};

/**
 * Free-text search across make, model, category and description.
 *
 * Every term must match somewhere (AND across terms), but a term may match any
 * field in any of its spelling variants (OR within a term). Searching
 * "تويوتا كامري" therefore requires both words, which is what stops a
 * single-word match from flooding the results.
 */
function buildSearchCondition(search: string): Prisma.CarWhereInput | null {
  const tokens = tokenizeQuery(search);
  if (tokens.length === 0) return null;

  return {
    AND: tokens.map((token) => ({
      OR: buildSpellingVariants(token).flatMap((variant) => [
        { make: { contains: variant, mode: "insensitive" as const } },
        { model: { contains: variant, mode: "insensitive" as const } },
        { category: { contains: variant, mode: "insensitive" as const } },
        { description: { contains: variant, mode: "insensitive" as const } },
      ]),
    })),
  };
}

/** Matches a stored make despite spelling drift in existing rows. */
function buildMakeCondition(make: string): Prisma.CarWhereInput | null {
  const variants = buildSpellingVariants(make);
  if (variants.length === 0) return null;

  return {
    OR: variants.map((variant) => ({
      make: { contains: variant, mode: "insensitive" as const },
    })),
  };
}

/** Translates a validated query into a Prisma `where`. Exported for tests. */
export function buildCarWhere(
  query: CarQuery,
  { publicOnly = true }: { publicOnly?: boolean } = {},
): Prisma.CarWhereInput {
  const conditions: Prisma.CarWhereInput[] = [];

  // Sold and unavailable stock is admin-visible but never listed publicly.
  if (publicOnly) conditions.push({ status: "AVAILABLE" });

  const search = buildSearchCondition(query.search);
  if (search) conditions.push(search);

  const makeCondition = query.make ? buildMakeCondition(query.make) : null;
  if (makeCondition) conditions.push(makeCondition);

  if (query.bodyType) conditions.push({ bodyType: { equals: query.bodyType, mode: "insensitive" } });
  if (query.fuelType) conditions.push({ fuelType: { equals: query.fuelType, mode: "insensitive" } });
  if (query.transmission) {
    conditions.push({ transmission: { equals: query.transmission, mode: "insensitive" } });
  }
  if (query.color) conditions.push({ color: { equals: query.color, mode: "insensitive" } });

  if (query.minPrice > 0 || query.maxPrice !== undefined) {
    conditions.push({
      price: {
        gte: query.minPrice,
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      },
    });
  }

  // Only filter when the flag is explicitly true — `false` means "don't care",
  // not "show me the non-economy cars".
  if (query.isEconomic) conditions.push({ isEconomic: true });
  if (query.isCommercial) conditions.push({ isCommercial: true });
  if (query.isLuxury) conditions.push({ isLuxury: true });

  return conditions.length > 0 ? { AND: conditions } : {};
}

export interface CarPage {
  cars: Car[];
  total: number;
}

/** One page of cars plus the total, in a single round trip. */
export async function findMany(
  query: CarQuery,
  page: PageParams,
  options: { publicOnly?: boolean } = {},
): Promise<CarPage> {
  const where = buildCarWhere(query, options);
  const { skip, take } = toSkipTake(page);

  const [cars, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.car.findMany({ where, orderBy: SORT_CLAUSES[query.sortBy], skip, take }),
      prisma.car.count({ where }),
    ]),
  );

  return { cars, total };
}

export async function findById(id: string): Promise<Car | null> {
  return withDbRetry(() => prisma.car.findUnique({ where: { id } }));
}

/**
 * Cars a shopper is likely to consider next: same body type, comparable price.
 * Ordered by price so the closest matches surface first.
 */
export async function findSimilar(car: Car, limit: number): Promise<Car[]> {
  const price = Number(car.price);

  return withDbRetry(() =>
    prisma.car.findMany({
      where: {
        id: { not: car.id },
        status: "AVAILABLE",
        OR: [
          { bodyType: car.bodyType },
          { make: car.make },
          { price: { gte: price * 0.8, lte: price * 1.2 } },
        ],
      },
      orderBy: { price: "asc" },
      take: limit,
    }),
  );
}

export async function findFeatured(limit: number): Promise<Car[]> {
  return withDbRetry(() =>
    prisma.car.findMany({
      where: { featured: true, status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

/**
 * Distinct values for the filter dropdowns, scoped to available stock so the
 * UI never offers a filter that returns nothing.
 *
 * `distinct` runs against unnormalised stored text, so " تويوتا" and "تويوتا"
 * arrive as separate rows — `dedupeCarTexts` collapses them.
 */
export async function findFilterOptions(): Promise<{
  makes: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  transmissions: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
}> {
  const where: Prisma.CarWhereInput = { status: "AVAILABLE" };

  const [rows, aggregate] = await withDbRetry(() =>
    Promise.all([
      prisma.car.findMany({
        where,
        select: {
          make: true,
          bodyType: true,
          fuelType: true,
          transmission: true,
          color: true,
        },
      }),
      prisma.car.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    ]),
  );

  return {
    makes: dedupeCarTexts(rows.map((row) => row.make)).sort((a, b) => a.localeCompare(b, "ar")),
    bodyTypes: dedupeCarTexts(rows.map((row) => row.bodyType)).sort(),
    fuelTypes: dedupeCarTexts(rows.map((row) => row.fuelType)).sort(),
    transmissions: dedupeCarTexts(rows.map((row) => row.transmission)).sort(),
    colors: dedupeCarTexts(rows.map((row) => row.color)).sort(),
    minPrice: Number(aggregate._min.price ?? 0),
    maxPrice: Number(aggregate._max.price ?? 0),
  };
}

export async function create(data: Prisma.CarCreateInput): Promise<Car> {
  return withDbRetry(() => prisma.car.create({ data }));
}

export async function update(id: string, data: Prisma.CarUpdateInput): Promise<Car> {
  return withDbRetry(() => prisma.car.update({ where: { id }, data }));
}

export async function remove(id: string): Promise<Car> {
  return withDbRetry(() => prisma.car.delete({ where: { id } }));
}

/** Ids of the cars this user has saved, for marking hearts in a listing. */
export async function findSavedCarIds(userId: string, carIds: string[]): Promise<Set<string>> {
  if (carIds.length === 0) return new Set();

  const saved = await withDbRetry(() =>
    prisma.userSavedCar.findMany({
      where: { userId, carId: { in: carIds } },
      select: { carId: true },
    }),
  );

  return new Set(saved.map((row) => row.carId));
}

export async function findSavedCars(userId: string): Promise<Car[]> {
  const saved = await withDbRetry(() =>
    prisma.userSavedCar.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      include: { car: true },
    }),
  );

  return saved.map((row) => row.car);
}

export async function saveCar(userId: string, carId: string): Promise<void> {
  await withDbRetry(() => prisma.userSavedCar.create({ data: { userId, carId } }));
}

export async function unsaveCar(userId: string, carId: string): Promise<void> {
  await withDbRetry(() =>
    prisma.userSavedCar.delete({ where: { userId_carId: { userId, carId } } }),
  );
}

export async function isCarSaved(userId: string, carId: string): Promise<boolean> {
  const saved = await withDbRetry(() =>
    prisma.userSavedCar.findUnique({
      where: { userId_carId: { userId, carId } },
      select: { id: true },
    }),
  );

  return saved !== null;
}
