import { db } from "@/lib/prisma";
import { serializedCarsData } from "@/lib/helper";
import { getCarsByFiltersSupabase } from "@/lib/supabaseReads";
import {
  buildDynamicAliasGroups,
  buildPrismaCarSearchConditions,
  buildChatSearchQuery,
  parseBudgetFromQuery,
  registerDynamicAliases,
  wantsLuxuryCars,
} from "@/lib/car-search";

const CHAT_CAR_SELECT = {
  id: true,
  make: true,
  model: true,
  year: true,
  price: true,
  mileage: true,
  color: true,
  fuelType: true,
  transmission: true,
  bodyType: true,
  seats: true,
  description: true,
  images: true,
  featured: true,
  isLuxury: true,
  insuranceSegment: true,
};

const CHAT_RESULT_LIMIT = 10;
const ALIAS_CACHE_MS = 5 * 60 * 1000;
let aliasesLoadedAt = 0;

async function ensureInventoryAliases() {
  if (Date.now() - aliasesLoadedAt < ALIAS_CACHE_MS) return;

  try {
    const rows = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: { make: true, model: true },
      distinct: ["make", "model"],
    });
    registerDynamicAliases(buildDynamicAliasGroups(rows));
    aliasesLoadedAt = Date.now();
  } catch (error) {
    console.error("[chat-car-search] Failed to load inventory aliases:", error);
  }
}

function buildPriceFilter(budget) {
  if (!budget) return null;

  const price = {};
  if (budget.minPrice != null) price.gte = budget.minPrice;
  if (budget.maxPrice != null) price.lte = budget.maxPrice;
  return Object.keys(price).length > 0 ? price : null;
}

function buildWhereClause(searchText, budget, luxuryOnly) {
  const andConditions = [{ status: "AVAILABLE" }];
  const searchConditions = buildPrismaCarSearchConditions(searchText);

  if (searchConditions.length > 0) {
    andConditions.push(...searchConditions);
  }

  const priceFilter = buildPriceFilter(budget);
  if (priceFilter) {
    andConditions.push({ price: priceFilter });
  }

  if (luxuryOnly) {
    andConditions.push({ isLuxury: true });
  }

  return { AND: andConditions };
}

function buildOrderBy(luxuryOnly) {
  return luxuryOnly
    ? [{ featured: "desc" }, { price: "desc" }, { createdAt: "desc" }]
    : [{ featured: "desc" }, { createdAt: "desc" }];
}

async function queryCarsPrisma(where, orderBy) {
  return db.car.findMany({
    where,
    take: CHAT_RESULT_LIMIT,
    orderBy,
    select: CHAT_CAR_SELECT,
  });
}

async function queryCarsSupabase(searchText, budget) {
  const result = await getCarsByFiltersSupabase({
    search: searchText,
    minPrice: budget?.minPrice ?? 0,
    maxPrice: budget?.maxPrice ?? Number.MAX_SAFE_INTEGER,
    sortBy: "newest",
    page: 1,
    limit: CHAT_RESULT_LIMIT,
  });

  return (result?.cars || []).map((car) => ({
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    color: car.color,
    fuelType: car.fuelType,
    transmission: car.transmission,
    bodyType: car.bodyType,
    seats: car.seats,
    description: car.description,
    images: car.images,
    featured: car.featured,
    isLuxury: car.isLuxury,
    insuranceSegment: car.insuranceSegment,
  }));
}

export async function searchCarsForChat(query, conversationHistory = []) {
  await ensureInventoryAliases();

  const searchText = buildChatSearchQuery(query, conversationHistory);
  const budget = parseBudgetFromQuery(searchText);
  const luxuryOnly = wantsLuxuryCars(searchText);
  const where = buildWhereClause(searchText, budget, luxuryOnly);
  const orderBy = buildOrderBy(luxuryOnly);

  try {
    let cars = await queryCarsPrisma(where, orderBy);

    if (cars.length === 0 && luxuryOnly) {
      cars = await queryCarsPrisma(
        {
          AND: [{ status: "AVAILABLE" }, { isLuxury: true }, ...(buildPriceFilter(budget) ? [{ price: buildPriceFilter(budget) }] : [])],
        },
        orderBy
      );
    }

    if (cars.length === 0 && buildPrismaCarSearchConditions(searchText).length === 0) {
      cars = await queryCarsPrisma(
        {
          AND: [
            { status: "AVAILABLE" },
            ...(buildPriceFilter(budget) ? [{ price: buildPriceFilter(budget) }] : []),
          ],
        },
        [{ featured: "desc" }, { createdAt: "desc" }]
      );
    }

    return cars.map((car) => serializedCarsData(car));
  } catch (error) {
    console.error("[chat-car-search] Prisma search failed, using Supabase:", error);
    try {
      const cars = await queryCarsSupabase(searchText, budget);
      return cars.map((car) => serializedCarsData(car));
    } catch (fallbackError) {
      console.error("[chat-car-search] Supabase fallback failed:", fallbackError);
      return [];
    }
  }
}

export async function fetchEconomicalCarsForChat(maxPrice = null) {
  await ensureInventoryAliases();

  const where = {
    status: "AVAILABLE",
    ...(maxPrice != null ? { price: { lte: maxPrice } } : {}),
  };

  try {
    const cars = await db.car.findMany({
      where,
      take: CHAT_RESULT_LIMIT,
      orderBy: [{ price: "asc" }, { mileage: "asc" }],
      select: CHAT_CAR_SELECT,
    });
    return cars.map((car) => serializedCarsData(car));
  } catch (error) {
    console.error("[chat-car-search] fetchEconomicalCarsForChat:", error);
    return [];
  }
}

export async function fetchLatestOfferCarsForChat() {
  await ensureInventoryAliases();

  try {
    const cars = await db.car.findMany({
      where: { status: "AVAILABLE" },
      take: CHAT_RESULT_LIMIT,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: CHAT_CAR_SELECT,
    });
    return cars.map((car) => serializedCarsData(car));
  } catch (error) {
    console.error("[chat-car-search] fetchLatestOfferCarsForChat:", error);
    return [];
  }
}

export async function fetchAllAvailableCarsForChat(limit = 50) {
  await ensureInventoryAliases();

  try {
    const cars = await db.car.findMany({
      where: { status: "AVAILABLE" },
      take: limit,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: CHAT_CAR_SELECT,
    });
    return cars.map((car) => serializedCarsData(car));
  } catch (error) {
    console.error("[chat-car-search] fetchAllAvailableCarsForChat:", error);
    return [];
  }
}
