import "server-only";

import type { Prisma, TestDriveBooking } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import { toSkipTake, type PageParams } from "@/lib/pagination";
import type { BookingQuery } from "./test-drive.schema";
import type { BookingWithRelations } from "./test-drive.types";

const withCar = { car: true } as const;
const withCarAndUser = { car: true, user: true } as const;

/** Statuses that still occupy a slot. Cancelled and no-show free it up. */
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

function buildWhere(query: BookingQuery): Prisma.TestDriveBookingWhereInput {
  const conditions: Prisma.TestDriveBookingWhereInput[] = [];

  if (query.status) conditions.push({ status: query.status });

  if (query.search) {
    conditions.push({
      OR: [
        { car: { make: { contains: query.search, mode: "insensitive" } } },
        { car: { model: { contains: query.search, mode: "insensitive" } } },
        { user: { name: { contains: query.search, mode: "insensitive" } } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function findManyForAdmin(
  query: BookingQuery,
  page: PageParams,
): Promise<{ bookings: BookingWithRelations[]; total: number }> {
  const where = buildWhere(query);
  const { skip, take } = toSkipTake(page);

  const [bookings, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.testDriveBooking.findMany({
        where,
        include: withCarAndUser,
        orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
        skip,
        take,
      }),
      prisma.testDriveBooking.count({ where }),
    ]),
  );

  return { bookings, total };
}

export async function findByUser(userId: string): Promise<BookingWithRelations[]> {
  return withDbRetry(() =>
    prisma.testDriveBooking.findMany({
      where: { userId },
      include: withCar,
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    }),
  );
}

export async function findById(id: string): Promise<BookingWithRelations | null> {
  return withDbRetry(() =>
    prisma.testDriveBooking.findUnique({ where: { id }, include: withCarAndUser }),
  );
}

/** Start times already occupied for a car on a date. */
export async function findTakenStartTimes(
  carId: string,
  bookingDate: Date,
): Promise<string[]> {
  const bookings = await withDbRetry(() =>
    prisma.testDriveBooking.findMany({
      where: { carId, bookingDate, status: { in: [...ACTIVE_STATUSES] } },
      select: { startTime: true },
    }),
  );

  return bookings.map((booking) => booking.startTime);
}

/** An existing active booking by this user for this car, if any. */
export async function findActiveBookingForUser(
  carId: string,
  userId: string,
): Promise<TestDriveBooking | null> {
  return withDbRetry(() =>
    prisma.testDriveBooking.findFirst({
      where: { carId, userId, status: { in: [...ACTIVE_STATUSES] } },
    }),
  );
}

/**
 * Books a slot, re-checking availability inside the transaction.
 *
 * v1 checked then created as two separate statements, so two people submitting
 * the same slot within a few milliseconds both passed the check and both rows
 * were written. Doing the check inside the transaction closes most of that
 * window.
 *
 * The complete fix is a unique index on (carId, bookingDate, startTime) — see
 * `prisma/migrations/README.md`. It is not applied here because the column set
 * is shared with the v1 app still in production, and existing duplicate rows
 * would make the migration fail.
 */
export async function createBooking(
  data: Prisma.TestDriveBookingUncheckedCreateInput,
): Promise<BookingWithRelations | null> {
  return withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const clash = await tx.testDriveBooking.findFirst({
        where: {
          carId: data.carId,
          bookingDate: data.bookingDate,
          startTime: data.startTime,
          status: { in: [...ACTIVE_STATUSES] },
        },
        select: { id: true },
      });

      // Null means "someone took it first" — the service turns that into a
      // CONFLICT. Returning null rather than throwing keeps the transaction
      // callback free of domain concerns.
      if (clash) return null;

      return tx.testDriveBooking.create({ data, include: withCarAndUser });
    }),
  );
}

export async function updateStatus(
  id: string,
  status: string,
): Promise<BookingWithRelations> {
  return withDbRetry(() =>
    prisma.testDriveBooking.update({
      where: { id },
      data: { status: status as Prisma.EnumBookingStatusFieldUpdateOperationsInput["set"] },
      include: withCarAndUser,
    }),
  );
}

export async function remove(id: string): Promise<void> {
  await withDbRetry(() => prisma.testDriveBooking.delete({ where: { id } }));
}

export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await withDbRetry(() =>
    prisma.testDriveBooking.groupBy({ by: ["status"], _count: true }),
  );

  return Object.fromEntries(rows.map((row) => [row.status, row._count]));
}
