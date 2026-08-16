"use server";

import { revalidatePath } from "next/cache";
import * as service from "./test-drive.service";
import { toResult, type Result } from "@/server/errors/result";
import type { BookingDto, AvailabilityDto } from "./test-drive.types";

/**
 * Availability *is* an action rather than a page read, because the date picker
 * fetches it interactively as the customer clicks through days.
 */
export async function getAvailabilityAction(
  carId: string,
  date: string,
): Promise<Result<AvailabilityDto>> {
  return toResult(() => service.getAvailability({ carId, date }));
}

export async function bookTestDriveAction(input: unknown): Promise<Result<BookingDto>> {
  return toResult(async () => {
    const booking = await service.bookTestDrive(input);

    revalidatePath("/reservations");
    revalidatePath(`/cars/${booking.car.id}`);
    revalidatePath("/admin/test-drives");

    return booking;
  });
}

export async function cancelMyBookingAction(id: string): Promise<Result<BookingDto>> {
  return toResult(async () => {
    const booking = await service.cancelMyBooking(id);

    revalidatePath("/reservations");
    revalidatePath("/admin/test-drives");

    return booking;
  });
}

export async function updateBookingStatusAction(
  id: string,
  input: unknown,
): Promise<Result<BookingDto>> {
  return toResult(async () => {
    const booking = await service.updateBookingStatus(id, input);

    revalidatePath("/admin/test-drives");
    revalidatePath("/reservations");

    return booking;
  });
}
