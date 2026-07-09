"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { getCarByIdSupabase } from "@/lib/supabaseReads";
import { carDisplayPriorityOrderBy } from "@/lib/data";

export async function getCarById(carId) {
  try {
    const user = await getAuthenticatedUser();

    const car = await db.car.findUnique({
      where: { id: carId },
    });

    if (!car)
      return {
        success: false,
        message: "Car not found",
      };

    let isWishlisted = false;
    let userTestDrive = null;
    let existingTestDrive;

    if (user) {
      const savedCar = await db.UserSavedCar.findUnique({
        where: {
          userId_carId: {
            carId,
            userId: user.id,
          },
        },
      });

      isWishlisted = !!savedCar;

      existingTestDrive = await db.TestDriveBooking.findFirst({
        where: {
          carId,
          userId: user.id,
          status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (existingTestDrive) {
      userTestDrive = {
        id: existingTestDrive.id,
        status: existingTestDrive.status,
        bookingDate: existingTestDrive.bookingDate.toISOString(),
      };
    }

    const dealership = await db.DealershipInfo.findFirst({
      include: {
        workingHours: true,
      },
    });

    const existingBookings = await db.TestDriveBooking.findMany({
      where: {
        carId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        bookingDate: true,
        startTime: true,
        endTime: true,
      },
    });

    return {
      success: true,
      data: {
        ...serializedCarsData(car, isWishlisted),
        testDriveInfo: {
          userTestDrive,
          dealership: dealership
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
            : null,
          existingBookings: existingBookings.map((booking) => ({
            date: booking.bookingDate.toISOString().split("T")[0],
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        },
      },
      user: user,
    };
  } catch (error) {
    console.warn("[getCarById] Prisma failed, using Supabase:", error.message);
    return getCarByIdSupabase(carId);
  }
}

export async function getSimilarCars(carId, limit = 4) {
  try {
    const currentCar = await db.car.findUnique({
      where: { id: carId },
      select: {
        id: true,
        make: true,
        bodyType: true,
        category: true,
      },
    });

    if (!currentCar) {
      return { success: false, data: [] };
    }

    const similarConditions = [
      currentCar.category ? { category: currentCar.category } : null,
      currentCar.bodyType ? { bodyType: currentCar.bodyType } : null,
      currentCar.make ? { make: currentCar.make } : null,
    ].filter(Boolean);

    if (!similarConditions.length) {
      return { success: true, data: [] };
    }

    const cars = await db.car.findMany({
      where: {
        id: { not: carId },
        status: "AVAILABLE",
        OR: similarConditions,
      },
      take: limit,
      orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: cars.map((car) => serializedCarsData(car)),
    };
  } catch (error) {
    console.warn("[getSimilarCars] Prisma failed:", error.message);
    return { success: false, data: [] };
  }
}
