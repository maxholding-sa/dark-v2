import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** `YYYY-MM-DD`. A wall-clock date, deliberately not an instant. */
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "validation.invalidNumber");

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.invalidNumber");

export const bookingInputSchema = z.object({
  carId: z.string().uuid("validation.required"),
  bookingDate: dateKey,
  startTime: timeOfDay,
  endTime: timeOfDay,
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null)
    .nullable()
    .optional(),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const bookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;

export const bookingQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type BookingQuery = z.infer<typeof bookingQuerySchema>;

export function parseBookingQuery(input: unknown): BookingQuery {
  const parsed = bookingQuerySchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : bookingQuerySchema.parse({});
}

export const bookingIdSchema = z.string().uuid("validation.required");

export const availabilityQuerySchema = z.object({
  carId: z.string().uuid("validation.required"),
  date: dateKey,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/**
 * Which status changes are legal.
 *
 * v1 let an admin set any status from any other, so a COMPLETED drive could be
 * moved back to PENDING and a CANCELLED one silently revived. Terminal states
 * are terminal.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
