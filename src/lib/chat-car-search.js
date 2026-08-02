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
import {
  fuzzyMatchInventory,
  aiResolveInventoryMatches,
  buildMatchWhereConditions,
} from "@/lib/chat-car-resolve";

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
let inventoryCatalog = { makes: [], models: [], pairs: [] };

async function ensureInventoryAliases() {
  if (Date.now() - aliasesLoadedAt < ALIAS_CACHE_MS && inventoryCatalog.pairs.length) {
    return inventoryCatalog;
  }

  try {
    const rows = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: { make: true, model: true },
      distinct: ["make", "model"],
    });
    registerDynamicAliases(buildDynamicAliasGroups(rows));

    const makes = [...new Set(rows.map((r) => String(r.make || "").trim()).filter(Boolean))];
    const models = [...new Set(rows.map((r) => String(r.model || "").trim()).filter(Boolean))];
    const pairs = rows
      .map((r) => ({
        make: String(r.make || "").trim(),
        model: String(r.model || "").trim(),
      }))
      .filter((p) => p.make && p.model);

    inventoryCatalog = { makes, models, pairs };
    aliasesLoadedAt = Date.now();
  } catch (error) {
    console.error("[chat-car-search] Failed to load inventory aliases:", error);
  }

  return inventoryCatalog;
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

async function queryByResolvedMatches(matches, budget, luxuryOnly) {
  const matchConditions = buildMatchWhereConditions(matches);
  if (!matchConditions.length) return [];

  const andConditions = [{ status: "AVAILABLE" }, { OR: matchConditions }];
  const priceFilter = buildPriceFilter(budget);
  if (priceFilter) andConditions.push({ price: priceFilter });
  if (luxuryOnly) andConditions.push({ isLuxury: true });

  return queryCarsPrisma({ AND: andConditions }, buildOrderBy(luxuryOnly));
}

/**
 * When exact token search fails, resolve against live inventory:
 * 1) fuzzy make/model similarity (typos / partials / unknown names in DB)
 * 2) Gemini mapping for Arabic↔English and hard cases
 */
async function resolveAndSearch(searchText, budget, luxuryOnly) {
  const catalog = await ensureInventoryAliases();
  if (!catalog.pairs.length) return [];

  const trimmed = String(searchText || "").trim();
  // Skip resolve for pure chitchat / flow commands
  if (
    /^(الغاء|إلغاء|cancel|توقف|ارجع|رجوع|نعم|لا|ok|تمام)$/i.test(trimmed) ||
    trimmed.length < 2
  ) {
    return [];
  }

  const fuzzy = fuzzyMatchInventory(trimmed, catalog, {
    limit: 8,
    minScore: 0.64,
  });
  if (fuzzy.length) {
    const cars = await queryByResolvedMatches(fuzzy, budget, luxuryOnly);
    if (cars.length) {
      console.log("[chat-car-search] Fuzzy inventory resolve", {
        query: trimmed,
        matches: fuzzy.slice(0, 3).map((m) => ({
          make: m.make,
          model: m.model,
          score: Number(m.score.toFixed(2)),
        })),
        count: cars.length,
      });
      return cars;
    }
  }

  const aiMatches = await aiResolveInventoryMatches(trimmed, catalog, {
    limit: 5,
  });
  if (aiMatches.length) {
    const cars = await queryByResolvedMatches(aiMatches, budget, luxuryOnly);
    if (cars.length) {
      console.log("[chat-car-search] AI inventory resolve", {
        query: trimmed,
        matches: aiMatches,
        count: cars.length,
      });
      return cars;
    }
  }

  return [];
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
          AND: [
            { status: "AVAILABLE" },
            { isLuxury: true },
            ...(buildPriceFilter(budget) ? [{ price: buildPriceFilter(budget) }] : []),
          ],
        },
        orderBy
      );
    }

    if (
      cars.length === 0 &&
      buildPrismaCarSearchConditions(searchText).length === 0
    ) {
      // Only dump featured inventory when the query looks like a car browse request
      const looksLikeBrowse =
        /سيار|عروض|متوفر|مخزون|عرض|cars?|available|show|أبي|ابغى|أريد|اريد|وريني|شوف/i.test(
          searchText
        ) &&
        !/تواصل|أرقام|ارقام|اتصال|رقم|جوال|هاتف|واتساب|contact|phone|راتب|قسط|مقارن|أفضل|افضل/i.test(
          searchText
        );
      if (looksLikeBrowse || budget?.maxPrice != null || budget?.minPrice != null) {
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
    }

    // Smart fallback: known aliases, unknown inventory names, typos, AR/EN
    if (cars.length === 0 && String(searchText || "").trim().length >= 2) {
      cars = await resolveAndSearch(searchText, budget, luxuryOnly);
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
