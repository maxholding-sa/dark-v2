import type { Car, TestDriveBooking, User } from "@prisma/client";
import { toCarDto, type CarDto } from "@/server/modules/cars/car.types";
import type { BookingStatus } from "./test-drive.schema";
import { toDateKey, type TimeSlot } from "@/lib/time-slots";

/** Bookable slots for one car on one date, as computed by the service. */
export interface AvailabilityDto {
  date: string;
  /** False when the showroom is closed that day, or the date has passed. */
  isOpen: boolean;
  slots: TimeSlot[];
}

export type BookingWithRelations = TestDriveBooking & { car: Car; user?: User };

export interface BookingCustomerDto {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

export interface BookingDto {
  id: string;
  /** `YYYY-MM-DD` — the wall-clock date, never an instant. */
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  car: CarDto;
  /** Present only on the admin view; a customer never sees another customer. */
  customer: BookingCustomerDto | null;
}

export function toBookingDto(
  booking: BookingWithRelations,
  { includeCustomer = false }: { includeCustomer?: boolean } = {},
): BookingDto {
  return {
    id: booking.id,
    // `@db.Date` comes back as UTC midnight; format it as a plain key rather
    // than letting the server's timezone shift it a day.
    bookingDate: toDateKey(booking.bookingDate, "UTC"),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status as BookingStatus,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
    car: toCarDto(booking.car),
    customer:
      includeCustomer && booking.user
        ? {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
            phone: booking.user.phone,
          }
        : null,
  };
}

export function toBookingDtos(
  bookings: BookingWithRelations[],
  options?: { includeCustomer?: boolean },
): BookingDto[] {
  return bookings.map((booking) => toBookingDto(booking, options));
}
