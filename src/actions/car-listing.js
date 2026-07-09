"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  fuelTypes as predefinedFuelTypes,
  transmissions as predefinedTransmissions,
  bodyTypeOptions as predefinedBodyTypes,
  carDisplayPriorityOrderBy,
} from "@/lib/data";

import { unstable_cache } from "next/cache";
import {
  getCarFiltersSupabase,
  getCarsByFiltersSupabase,
} from "@/lib/supabaseReads";
import { buildPrismaCarSearchConditions } from "@/lib/car-search";

// creating filter on the basis of cars in db
export const getCarFilters = unstable_cache(
  async () => {
    try {
      // get unique makes
      const makes = await db.car.findMany({
        where: { status: "AVAILABLE" },
        select: { make: true },
        distinct: ["make"],
        orderBy: { make: "asc" },
      });

      // get unique bodyTypes
      const bodyTypes_db = await db.car.findMany({
        where: { status: "AVAILABLE" },
        select: { bodyType: true },
        distinct: ["bodyType"],
        orderBy: { bodyType: "asc" },
      });

      // get unique fuelTypes
      const fuelTypes_db = await db.car.findMany({
        where: { status: "AVAILABLE" },
        select: { fuelType: true },
        distinct: ["fuelType"],
        orderBy: { fuelType: "asc" },
      });

      // get unique transmissions
      const transmissions_db = await db.car.findMany({
        where: { status: "AVAILABLE" },
        select: { transmission: true },
        distinct: ["transmission"],
        orderBy: { transmission: "asc" },
      });

      //   get min and max prices using Prisma Aggregations
      const priceAggregations = await db.car.aggregate({
        where: { status: "AVAILABLE" },
        _min: { price: true },
        _max: { price: true },
      });

      // Extract values from database
      const makesList = makes.map((item) => item.make);
      const bodyTypesList = bodyTypes_db.map((item) => item.bodyType);
      const fuelTypesList = fuelTypes_db.map((item) => item.fuelType);
      const transmissionsList = transmissions_db.map((item) => item.transmission);

      // Filter predefined options to only show those that exist in database
      const availableBodyTypes = predefinedBodyTypes.filter(type => bodyTypesList.includes(type));
      const availableFuelTypes = predefinedFuelTypes.filter(type => fuelTypesList.includes(type));
      const availableTransmissions = predefinedTransmissions.filter(type => transmissionsList.includes(type));

      return {
        success: true,
        data: {
          makes: makesList.length >= 1 ? makesList : [],
          bodyTypes: availableBodyTypes.length >= 1 ? availableBodyTypes : [],
          fuelTypes: availableFuelTypes.length >= 1 ? availableFuelTypes : [],
          transmissions: availableTransmissions.length >= 1 ? availableTransmissions : [],
          priceRange: {
            min: priceAggregations._min.price
              ? parseFloat(priceAggregations._min.price.toString())
              : 0,
            max: priceAggregations._max.price
              ? parseFloat(priceAggregations._max.price.toString())
              : 100000,
          },
        },
      };
    } catch (error) {
      console.warn("[getCarFilters] Prisma failed, using Supabase:", error.message);
      return getCarFiltersSupabase();
    }
  },
  ["car-filters-v2"],
  { revalidate: 3600, tags: ["cars"] }
);

// fetch cars as per filters
export async function getCarsByFilters({
  search = "",
  make = "",
  bodyType = "",
  isEconomic,
  isCommercial,
  color = "",
  fuelType = "",
  transmission = "",
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  sortBy = "newest", // Options: newest, priceAsc, priceDesc
  page = 1,
  limit = 6,
}) {
  try {
    const user = await getAuthenticatedUser();

    // Build where conditions
    let where = {
      status: "AVAILABLE",
    };

    const searchConditions = buildPrismaCarSearchConditions(search);
    if (searchConditions.length > 0) {
      where.AND = searchConditions;
    }

    if (make) where.make = { contains: make, mode: "insensitive" };
    if (bodyType) where.bodyType = { equals: bodyType, mode: "insensitive" };
    if (typeof isEconomic === "boolean") where.isEconomic = isEconomic;
    if (typeof isCommercial === "boolean") where.isCommercial = isCommercial;
    if (color) where.color = { contains: color, mode: "insensitive" };
    if (fuelType) where.fuelType = { equals: fuelType, mode: "insensitive" };
    if (transmission)
      where.transmission = { equals: transmission, mode: "insensitive" };

    // Add price range
    where.price = {
      gte: parseFloat(minPrice) || 0, //gte - price is greater then minPrice
    };

    if (maxPrice && maxPrice < Number.MAX_SAFE_INTEGER) {
      where.price.lte = parseFloat(maxPrice); //lte - price is lower then maxPrice
    }

    const skip = (page - 1) * limit;

    // Determine sort order (فاخرة → featured → normal, then price or date)
    let orderBy = [];
    switch (sortBy) {
      case "priceAsc":
        orderBy = [...carDisplayPriorityOrderBy, { price: "asc" }];
        break;

      case "priceDesc":
        orderBy = [...carDisplayPriorityOrderBy, { price: "desc" }];
        break;

      case "newest":
      default:
        orderBy = [...carDisplayPriorityOrderBy, { createdAt: "desc" }];
        break;
    }

    const totalCarsCount = await db.car.count({ where });

    // execute the main query
    const cars = await db.car.findMany({
      where,
      take: limit,
      skip,
      orderBy,
    });

    let wishlisted = new Set(); //create a set so cars are not repeated

    //if user is logged in show wishlisted cars
    if (user) {
      const savedCars = await db.userSavedCar.findMany({
        where: { userId: user.id },
        select: { carId: true },
      });
      wishlisted = new Set(savedCars.map((saved) => saved.carId));
      const serializedCars = cars.map((car) => {
        return serializedCarsData(car, wishlisted.has(car.id));
      });

      return {
        success: true,
        data: serializedCars,
        pagination: {
          total: totalCarsCount,
          page,
          limit,
          pages: Math.ceil(totalCarsCount / limit),
        },
      };
    }
    // if user is not logged in then no wislisted cars
    else {
      const serializedCars = cars.map((car) => {
        return serializedCarsData(car);
      });

      return {
        success: true,
        data: serializedCars,
        pagination: {
          total: totalCarsCount,
          page,
          limit,
          pages: Math.ceil(totalCarsCount / limit),
        },
      };
    }
  } catch (error) {
    console.warn("[getCarsByFilters] Prisma failed, using Supabase:", error.message);
    return getCarsByFiltersSupabase({
      search,
      make,
      bodyType,
      isEconomic,
      isCommercial,
      color,
      fuelType,
      transmission,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
    });
  }
}

export async function toggleSavedCars(carId) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) throw new Error("User not found");

    // check if car exits
    const car = await db.car.findUnique({ where: { id: carId } });
    if (!car) {
      return {
        succes: false,
        error: "Car not found",
      };
    }

    // check if car  is already saved
    const existingCar = await db.userSavedCar.findUnique({
      where: {
        userId_carId: {
          userId: user.id,
          carId,
        },
      },
    });

    // if   car is already saved ,then remove the car
    if (existingCar) {
      await db.userSavedCar.delete({
        where: {
          userId_carId: {
            userId: user.id,
            carId,
          },
        },
      });
      revalidatePath(`/saved-cars`);
      return {
        success: true,
        saved: false,
        message: "Car removed from favorites",
      };
    }

    // if car is not saved ,then save the car
    await db.userSavedCar.create({
      data: {
        userId: user.id,
        carId,
      },
    });
    revalidatePath(`/saved-cars`);
    return {
      success: true,
      saved: true,
      message: "Car added to favorite",
    };
  } catch (error) {
    throw new Error("Error toggling saved cars : " + error.message);
  }
}

export async function getSavedCars() {
  try {
    const user = await getAuthenticatedUser();
    if (!user)
      return {
        success: false,
        message: "User not found",
      };

    const savedCars = await db.userSavedCar.findMany({
      where: { userId: user.id },
      include: { car: true },
      orderBy: { savedAt: "desc" },
    });

    const serializedSavedCars = savedCars.map((savedCar) =>
      serializedCarsData(savedCar.car, true)
    );

    return {
      success: true,
      data: serializedSavedCars,
    };
  } catch (error) {
    console.error("Error fecting saved cars : " + error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
