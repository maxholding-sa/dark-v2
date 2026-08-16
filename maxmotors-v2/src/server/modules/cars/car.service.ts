import "server-only";

import type { Prisma } from "@prisma/client";
import * as repository from "./car.repository";
import {
  carInputSchema,
  carUpdateSchema,
  carIdSchema,
  carStatusSchema,
  type CarQuery,
  type CarInput,
  type CarUpdateInput,
  type CarStatusInput,
} from "./car.schema";
import {
  toCarDto,
  toCarDtos,
  type CarDto,
  type CarWithSavedState,
  type CarFilterOptions,
} from "./car.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission, getSessionUser, requireUser } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { deleteFiles, storagePathFromUrl } from "@/server/db/storage";
import { paginate, type Paginated } from "@/lib/pagination";
import { logger } from "@/lib/logger";

/**
 * Business rules for cars. This is the only layer that decides *whether*
 * something may happen; the repository decides how it is stored and the
 * actions decide how it is transported.
 *
 * Everything a page or an action needs lives behind one of these functions.
 * Nothing above this layer sees a Prisma type.
 */

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Public listing. Saved-state is resolved in one extra query for the signed-in
 * user rather than per card, which is what made v1's listing issue N+1 lookups.
 */
export async function listCars(query: CarQuery): Promise<Paginated<CarWithSavedState>> {
  const { cars, total } = await repository.findMany(query, {
    page: query.page,
    limit: query.limit,
  });

  const user = await getSessionUser();
  const savedIds = user
    ? await repository.findSavedCarIds(
        user.id,
        cars.map((car) => car.id),
      )
    : new Set<string>();

  const items = cars.map((car) => ({
    ...toCarDto(car),
    isSaved: savedIds.has(car.id),
  }));

  return paginate(items, total, { page: query.page, limit: query.limit });
}

/** Admin listing — includes sold and unavailable stock. */
export async function listCarsForAdmin(query: CarQuery): Promise<Paginated<CarDto>> {
  await requirePermission(PERMISSIONS.CARS_VIEW);

  const { cars, total } = await repository.findMany(
    query,
    { page: query.page, limit: query.limit },
    { publicOnly: false },
  );

  return paginate(toCarDtos(cars), total, { page: query.page, limit: query.limit });
}

export async function getCar(id: string): Promise<CarWithSavedState> {
  const carId = parseOrThrow(carIdSchema, id);

  const car = await repository.findById(carId);
  if (!car) throw AppError.notFound("Car");

  const user = await getSessionUser();
  const isSaved = user ? await repository.isCarSaved(user.id, car.id) : false;

  return { ...toCarDto(car), isSaved };
}

export async function getSimilarCars(id: string, limit = 4): Promise<CarDto[]> {
  const car = await repository.findById(parseOrThrow(carIdSchema, id));
  if (!car) throw AppError.notFound("Car");

  return toCarDtos(await repository.findSimilar(car, limit));
}

export async function getFeaturedCars(limit = 6): Promise<CarDto[]> {
  return toCarDtos(await repository.findFeatured(limit));
}

export async function getFilterOptions(): Promise<CarFilterOptions> {
  const options = await repository.findFilterOptions();

  return {
    makes: options.makes,
    bodyTypes: options.bodyTypes,
    fuelTypes: options.fuelTypes,
    transmissions: options.transmissions,
    colors: options.colors,
    priceRange: { min: options.minPrice, max: options.maxPrice },
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createCar(input: unknown): Promise<CarDto> {
  await requirePermission(PERMISSIONS.CARS_CREATE);

  const data: CarInput = parseOrThrow(carInputSchema, input);
  const car = await repository.create(data satisfies Prisma.CarCreateInput);

  logger.info("car.created", { carId: car.id, make: car.make, model: car.model });
  return toCarDto(car);
}

export async function updateCar(id: string, input: unknown): Promise<CarDto> {
  await requirePermission(PERMISSIONS.CARS_UPDATE);

  const carId = parseOrThrow(carIdSchema, id);
  const data: CarUpdateInput = parseOrThrow(carUpdateSchema, input);

  const existing = await repository.findById(carId);
  if (!existing) throw AppError.notFound("Car");

  // Images dropped from the payload are no longer referenced anywhere, so the
  // storage objects would leak. Clean them up after the row is updated.
  const removedImages =
    data.images !== undefined
      ? existing.images.filter((url) => !data.images?.includes(url))
      : [];

  const car = await repository.update(carId, data satisfies Prisma.CarUpdateInput);

  if (removedImages.length > 0) {
    await deleteFiles(
      removedImages
        .map(storagePathFromUrl)
        .filter((path): path is string => path !== null),
    );
  }

  logger.info("car.updated", { carId, fields: Object.keys(data) });
  return toCarDto(car);
}

/** Partial update for the flags an admin toggles directly from the list. */
export async function updateCarStatus(id: string, input: unknown): Promise<CarDto> {
  await requirePermission(PERMISSIONS.CARS_UPDATE);

  const carId = parseOrThrow(carIdSchema, id);
  const data: CarStatusInput = parseOrThrow(carStatusSchema, input);

  if (Object.keys(data).length === 0) {
    throw AppError.validation("No status fields provided");
  }

  const car = await repository.update(carId, data);
  logger.info("car.statusUpdated", { carId, ...data });

  return toCarDto(car);
}

export async function deleteCar(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.CARS_DELETE);

  const carId = parseOrThrow(carIdSchema, id);

  const car = await repository.findById(carId);
  if (!car) throw AppError.notFound("Car");

  await repository.remove(carId);

  // Bookings and saved-car rows cascade at the database level; images do not.
  await deleteFiles(
    car.images.map(storagePathFromUrl).filter((path): path is string => path !== null),
  );

  logger.info("car.deleted", { carId });
}

// ---------------------------------------------------------------------------
// Saved cars
// ---------------------------------------------------------------------------

/**
 * Toggles the saved state and reports the state it ended in, so the client can
 * show the right confirmation without re-fetching.
 */
export async function toggleSavedCar(id: string): Promise<{ isSaved: boolean }> {
  const user = await requireUser();
  const carId = parseOrThrow(carIdSchema, id);

  const car = await repository.findById(carId);
  if (!car) throw AppError.notFound("Car");

  const alreadySaved = await repository.isCarSaved(user.id, carId);

  if (alreadySaved) {
    await repository.unsaveCar(user.id, carId);
    return { isSaved: false };
  }

  await repository.saveCar(user.id, carId);
  return { isSaved: true };
}

export async function getSavedCars(): Promise<CarDto[]> {
  const user = await requireUser();
  return toCarDtos(await repository.findSavedCars(user.id));
}
