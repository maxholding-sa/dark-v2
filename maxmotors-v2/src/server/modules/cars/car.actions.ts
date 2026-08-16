"use server";

import { revalidatePath } from "next/cache";
import * as service from "./car.service";
import { toResult, type Result } from "@/server/errors/result";
import { routes } from "@/config/routes";
import type { CarDto } from "./car.types";

/**
 * Server actions: transport only.
 *
 * Each one wraps a service call in `toResult`, revalidates the affected paths,
 * and returns. No validation, no permission checks, no queries — those belong
 * to the service, which is why the service stays testable without Next.js.
 *
 * Reads are *not* actions. Pages call the service directly on the server; an
 * action for a read only adds a POST round trip.
 */

export async function createCarAction(input: unknown): Promise<Result<CarDto>> {
  return toResult(async () => {
    const car = await service.createCar(input);

    revalidatePath(routes.cars);
    revalidatePath(routes.admin.cars);

    return car;
  });
}

export async function updateCarAction(
  id: string,
  input: unknown,
): Promise<Result<CarDto>> {
  return toResult(async () => {
    const car = await service.updateCar(id, input);

    revalidatePath(routes.cars);
    revalidatePath(routes.car(id));
    revalidatePath(routes.admin.cars);

    return car;
  });
}

export async function updateCarStatusAction(
  id: string,
  input: unknown,
): Promise<Result<CarDto>> {
  return toResult(async () => {
    const car = await service.updateCarStatus(id, input);

    revalidatePath(routes.cars);
    revalidatePath(routes.admin.cars);

    return car;
  });
}

export async function deleteCarAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteCar(id);

    revalidatePath(routes.cars);
    revalidatePath(routes.admin.cars);

    return { id };
  });
}

export async function toggleSavedCarAction(
  id: string,
): Promise<Result<{ isSaved: boolean }>> {
  return toResult(async () => {
    const state = await service.toggleSavedCar(id);

    revalidatePath(routes.savedCars);
    revalidatePath(routes.car(id));

    return state;
  });
}
