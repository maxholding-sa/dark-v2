/** Client-safe surface of the test-drives module. */

export {
  getAvailabilityAction,
  bookTestDriveAction,
  cancelMyBookingAction,
  updateBookingStatusAction,
} from "./test-drive.actions";

export {
  bookingInputSchema,
  bookingStatusSchema,
  bookingQuerySchema,
  parseBookingQuery,
  canTransition,
  ALLOWED_STATUS_TRANSITIONS,
  BOOKING_STATUSES,
} from "./test-drive.schema";

export type {
  BookingInput,
  BookingStatusInput,
  BookingQuery,
  BookingStatus,
} from "./test-drive.schema";

export type {
  BookingDto,
  BookingCustomerDto,
  AvailabilityDto,
} from "./test-drive.types";
