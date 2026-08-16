/**
 * Test-drive slot arithmetic.
 *
 * Pure functions over `HH:MM` strings — no Date objects, no timezones. The
 * showroom's opening hours are wall-clock times in Riyadh, not instants, so
 * converting them to Date would introduce a timezone bug on any server not set
 * to Asia/Riyadh. v1 generated these in the booking form component, which meant
 * the server accepted any `startTime` a caller sent.
 */

/** Minutes since midnight, or null when the string is not `HH:MM`. */
export function parseTimeOfDay(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTimeOfDay(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);

  return `${String(hours).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface SlotOptions {
  openTime: string;
  closeTime: string;
  /** Length of one test drive. */
  slotMinutes?: number;
}

/**
 * Every slot that fits between opening and closing.
 *
 * A slot must fit *entirely* within the window — a 60-minute drive starting 30
 * minutes before closing is not offered, because it cannot be completed.
 */
export function generateSlots({
  openTime,
  closeTime,
  slotMinutes = 60,
}: SlotOptions): TimeSlot[] {
  const open = parseTimeOfDay(openTime);
  const close = parseTimeOfDay(closeTime);

  if (open === null || close === null || slotMinutes <= 0) return [];
  if (close <= open) return [];

  const slots: TimeSlot[] = [];

  for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
    slots.push({
      startTime: formatTimeOfDay(start),
      endTime: formatTimeOfDay(start + slotMinutes),
    });
  }

  return slots;
}

/** Removes slots already taken, comparing on start time. */
export function excludeTakenSlots(
  slots: TimeSlot[],
  takenStartTimes: readonly string[],
): TimeSlot[] {
  const taken = new Set(takenStartTimes);
  return slots.filter((slot) => !taken.has(slot.startTime));
}

/**
 * Drops slots that have already begun, for bookings made today. Compares
 * wall-clock minutes so it stays consistent with the rest of this module.
 */
export function excludePastSlots(slots: TimeSlot[], nowMinutes: number): TimeSlot[] {
  return slots.filter((slot) => {
    const start = parseTimeOfDay(slot.startTime);
    return start !== null && start > nowMinutes;
  });
}

/** `YYYY-MM-DD` in the given timezone — the format the booking date column uses. */
export function toDateKey(date: Date, timeZone = "Asia/Riyadh"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Wall-clock minutes since midnight in the given timezone. */
export function currentMinutes(date: Date, timeZone = "Asia/Riyadh"): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return parseTimeOfDay(parts) ?? 0;
}

/** Prisma's `@db.Date` column ignores the time, so anchor at UTC midnight. */
export function dateKeyToUtcDate(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

/** Weekday of a `YYYY-MM-DD` key, matching the `DayOfWeek` enum. */
export function dayOfWeekFor(dateKey: string): DayName | null {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return null;

  return DAY_NAMES[date.getUTCDay()] ?? null;
}
