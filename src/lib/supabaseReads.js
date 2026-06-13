import { createClient } from "@supabase/supabase-js";
import { serializedCarsData } from "@/lib/helper";
import {
  fuelTypes as predefinedFuelTypes,
  transmissions as predefinedTransmissions,
  bodyTypeOptions as predefinedBodyTypes,
} from "@/lib/data";

/** Public Supabase client (anon key). Used when Prisma / DATABASE_URL is unavailable. */
export function getSupabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalizeCarRow(row) {
  if (!row) return row;
  return {
    ...row,
    price: row.price != null ? parseFloat(String(row.price)) : 0,
  };
}

function applyCarSort(query, sortBy) {
  let q = query
    .order("isLuxury", { ascending: false })
    .order("featured", { ascending: false });
  if (sortBy === "priceAsc") return q.order("price", { ascending: true });
  if (sortBy === "priceDesc") return q.order("price", { ascending: false });
  return q.order("createdAt", { ascending: false });
}

export async function getCarsByFiltersSupabase({
  search = "",
  make = "",
  bodyType = "",
  fuelType = "",
  transmission = "",
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  sortBy = "newest",
  page = 1,
  limit = 6,
} = {}) {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  let query = sb.from("Car").select("*", { count: "exact" }).eq("status", "AVAILABLE");

  const term = search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `make.ilike.${pattern},model.ilike.${pattern},description.ilike.${pattern}`
    );
  }
  if (make) query = query.ilike("make", make);
  if (bodyType) query = query.eq("bodyType", bodyType);
  if (fuelType) query = query.eq("fuelType", fuelType);
  if (transmission) query = query.eq("transmission", transmission);
  if (minPrice) query = query.gte("price", minPrice);
  if (maxPrice && maxPrice < Number.MAX_SAFE_INTEGER) {
    query = query.lte("price", maxPrice);
  }

  query = applyCarSort(query, sortBy);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const total = count ?? data?.length ?? 0;
  const serializedCars = (data ?? []).map((car) =>
    serializedCarsData(normalizeCarRow(car))
  );

  return {
    success: true,
    data: serializedCars,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getCarFiltersSupabase() {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("Car")
    .select("make, bodyType, fuelType, transmission, price")
    .eq("status", "AVAILABLE");
  if (error) throw new Error(error.message);

  const makes = new Set();
  const bodyTypes = new Set();
  const fuelTypes = new Set();
  const transmissions = new Set();
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const row of data ?? []) {
    if (row.make) makes.add(row.make);
    if (row.bodyType) bodyTypes.add(row.bodyType);
    if (row.fuelType) fuelTypes.add(row.fuelType);
    if (row.transmission) transmissions.add(row.transmission);
    const price = parseFloat(String(row.price ?? 0));
    if (!Number.isNaN(price)) {
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }
  }

  const bodyTypesList = [...bodyTypes];
  const fuelTypesList = [...fuelTypes];
  const transmissionsList = [...transmissions];

  return {
    success: true,
    data: {
      makes: [...makes].sort(),
      bodyTypes: predefinedBodyTypes.filter((t) => bodyTypesList.includes(t)),
      fuelTypes: predefinedFuelTypes.filter((t) => fuelTypesList.includes(t)),
      transmissions: predefinedTransmissions.filter((t) =>
        transmissionsList.includes(t)
      ),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice <= 0 ? 100000 : maxPrice,
      },
    },
  };
}

export async function getFeaturedCarsSupabase(limit = 4) {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("Car")
    .select("*")
    .eq("status", "AVAILABLE")
    .order("isLuxury", { ascending: false })
    .order("featured", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return {
    success: true,
    data: (data ?? []).map((c) => serializedCarsData(normalizeCarRow(c))),
  };
}

export async function getBanksSupabase() {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("Bank")
    .select("*")
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);

  const serializedBanks = (data ?? []).map((bank) => ({
    ...bank,
    interestRate: bank.interestRate
      ? parseFloat(String(bank.interestRate))
      : 0,
  }));

  return { success: true, data: serializedBanks };
}

export async function getFeaturedBrandsSupabase() {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("FeaturedBrand")
    .select("*")
    .eq("isActive", true)
    .order("order", { ascending: true });
  if (error) throw new Error(error.message);

  return { success: true, data: data ?? [] };
}

export async function getCarByIdSupabase(carId) {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("Car")
    .select("*")
    .eq("id", carId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { success: false, message: "Car not found" };

  return {
    success: true,
    data: {
      ...serializedCarsData(normalizeCarRow(data)),
      testDriveInfo: {
        userTestDrive: null,
        dealership: null,
        existingBookings: [],
      },
    },
    user: null,
  };
}

export async function getFeaturedModelsSupabase() {
  const sb = getSupabasePublic();
  if (!sb) throw new Error("Supabase not configured");

  const { data, error } = await sb
    .from("FeaturedModel")
    .select("*")
    .eq("isActive", true)
    .order("order", { ascending: true });
  if (error) throw new Error(error.message);

  return { success: true, data: data ?? [] };
}
