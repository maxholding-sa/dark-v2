/** Server surface of the test-drives module. */

export {
  getAvailability,
  bookTestDrive,
  getMyBookings,
  listBookingsForAdmin,
  updateBookingStatus,
  cancelMyBooking,
  getBookingCountsByStatus,
  hasActiveBookingForCar,
} from "./test-drive.service";

export * from "./client";
