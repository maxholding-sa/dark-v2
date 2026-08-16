import "server-only";

import * as repository from "./test-drive.repository";
import {
  bookingInputSchema,
  bookingStatusSchema,
  bookingIdSchema,
  availabilityQuerySchema,
  canTransition,
  type BookingQuery,
  type BookingStatus,
} from "./test-drive.schema";
import {
  toBookingDto,
  toBookingDtos,
  type BookingDto,
  type AvailabilityDto,
} from "./test-drive.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requireUser, requirePermission, getSessionUser } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { getDealershipInfo } from "@/server/modules/site-content";
import { findById as findCarById } from "@/server/modules/cars/car.repository";
import { enforceRateLimit } from "@/server/rate-limit";
import { paginate, type Paginated } from "@/lib/pagination";
import {
  generateSlots,
  excludeTakenSlots,
  excludePastSlots,
  dateKeyToUtcDate,
  dayOfWeekFor,
  toDateKey,
  currentMinutes,
} from "@/lib/time-slots";
import { logger } from "@/lib/logger";

/** How long one test drive takes. */
const SLOT_MINUTES = 60;

/** How far ahead a customer may book. */
const MAX_ADVANCE_DAYS = 30;

/**
 * Slots a customer can actually pick.
 *
 * Derived on the server from the showroom's working hours, so an unavailable
 * time cannot be booked by crafting a request — v1 built this list in the form
 * component and the server accepted whatever came back.
 */
export async function getAvailability(input: unknown): Promise<AvailabilityDto> {
  const { carId, date } = parseOrThrow(availabilityQuerySchema, input, "availability");

  const car = await findCarById(carId);
  if (!car) throw AppError.notFound("Car");
  if (!car.testDriveAvailable || car.status !== "AVAILABLE") {
    throw AppError.conflict("This car is not available for test drives");
  }

  const bookingDate = dateKeyToUtcDate(date);
  const dayOfWeek = dayOfWeekFor(date);
  if (!bookingDate || !dayOfWeek) throw AppError.validation("Invalid booking date");

  const today = toDateKey(new Date());
  if (date < today) return { date, isOpen: false, slots: [] };

  const dealership = await getDealershipInfo();
  const hours = dealership.workingHours.find((hour) => hour.dayOfWeek === dayOfWeek);

  if (!hours || !hours.isOpen) return { date, isOpen: false, slots: [] };

  const taken = await repository.findTakenStartTimes(carId, bookingDate);

  let slots = excludeTakenSlots(
    generateSlots({
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      slotMinutes: SLOT_MINUTES,
    }),
    taken,
  );

  // A slot that has already started today cannot be booked.
  if (date === today) slots = excludePastSlots(slots, currentMinutes(new Date()));

  return { date, isOpen: true, slots };
}

export async function bookTestDrive(input: unknown): Promise<BookingDto> {
  const user = await requireUser();

  // A signed-in account is the identity here, so throttle per user rather than
  // per IP — a household behind one address should not block each other.
  enforceRateLimit(user.id, { name: "test-drive", limit: 5, windowMs: 60 * 60 * 1000 });

  const data = parseOrThrow(bookingInputSchema, input, "booking");

  const bookingDate = dateKeyToUtcDate(data.bookingDate);
  if (!bookingDate) throw AppError.validation("Invalid booking date");

  const maxDate = new Date(Date.now() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
  if (data.bookingDate > toDateKey(maxDate)) {
    throw AppError.validation(`Bookings open ${MAX_ADVANCE_DAYS} days ahead`);
  }

  // Re-derive the legal slots and confirm the requested one is among them.
  const availability = await getAvailability({
    carId: data.carId,
    date: data.bookingDate,
  });

  const slot = availability.slots.find(
    (candidate) =>
      candidate.startTime === data.startTime && candidate.endTime === data.endTime,
  );

  if (!availability.isOpen || !slot) {
    throw AppError.conflict("That time slot is not available");
  }

  const existing = await repository.findActiveBookingForUser(data.carId, user.id);
  if (existing) {
    throw AppError.conflict("You already have an active booking for this car");
  }

  const booking = await repository.createBooking({
    carId: data.carId,
    userId: user.id,
    bookingDate,
    startTime: data.startTime,
    endTime: data.endTime,
    notes: data.notes ?? null,
    status: "PENDING",
  });

  // Null means another customer won the race inside the transaction.
  if (!booking) throw AppError.conflict("That time slot was just taken");

  logger.info("testDrive.booked", { bookingId: booking.id, carId: data.carId });
  return toBookingDto(booking);
}

export async function getMyBookings(): Promise<BookingDto[]> {
  const user = await requireUser();
  return toBookingDtos(await repository.findByUser(user.id));
}

export async function listBookingsForAdmin(
  query: BookingQuery,
): Promise<Paginated<BookingDto>> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { bookings, total } = await repository.findManyForAdmin(query, {
    page: query.page,
    limit: query.limit,
  });

  return paginate(toBookingDtos(bookings, { includeCustomer: true }), total, {
    page: query.page,
    limit: query.limit,
  });
}

/**
 * Moves a booking along its lifecycle. Only the transitions declared in
 * `ALLOWED_STATUS_TRANSITIONS` are accepted, so a completed drive cannot be
 * reopened and a cancellation cannot be silently undone.
 */
export async function updateBookingStatus(
  id: string,
  input: unknown,
): Promise<BookingDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const bookingId = parseOrThrow(bookingIdSchema, id, "id");
  const { status } = parseOrThrow(bookingStatusSchema, input, "status");

  const booking = await repository.findById(bookingId);
  if (!booking) throw AppError.notFound("Booking");

  const current = booking.status as BookingStatus;
  if (current === status) return toBookingDto(booking, { includeCustomer: true });

  if (!canTransition(current, status)) {
    throw AppError.conflict(`Cannot change a ${current} booking to ${status}`);
  }

  const updated = await repository.updateStatus(bookingId, status);
  logger.info("testDrive.statusChanged", { bookingId, from: current, to: status });

  return toBookingDto(updated, { includeCustomer: true });
}

/**
 * Customer-initiated cancellation.
 *
 * Cancels rather than deletes — v1 deleted the row, which destroyed the record
 * of a no-show and let the same customer rebook the slot with no history.
 */
export async function cancelMyBooking(id: string): Promise<BookingDto> {
  const user = await requireUser();
  const bookingId = parseOrThrow(bookingIdSchema, id, "id");

  const booking = await repository.findById(bookingId);
  if (!booking) throw AppError.notFound("Booking");

  // Not found rather than forbidden: revealing that someone else's booking
  // exists at this id would leak information.
  if (booking.userId !== user.id) throw AppError.notFound("Booking");

  const current = booking.status as BookingStatus;
  if (!canTransition(current, "CANCELLED")) {
    throw AppError.conflict(`A ${current} booking cannot be cancelled`);
  }

  return toBookingDto(await repository.updateStatus(bookingId, "CANCELLED"));
}

export async function getBookingCountsByStatus(): Promise<Record<string, number>> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return repository.countByStatus();
}

/** Whether the current viewer already holds an active booking for a car. */
export async function hasActiveBookingForCar(carId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  return (await repository.findActiveBookingForUser(carId, user.id)) !== null;
}
