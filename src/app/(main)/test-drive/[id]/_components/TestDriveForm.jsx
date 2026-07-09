"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar as CalendarIcon,
  Car,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { bookTestDrive } from "@/actions/test-drive";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

const testDriveSchema = z.object({
  date: z.date({
    required_error: "Please select a date for your test drive",
  }),
  timeSlot: z.string({
    required_error: "Please select a time slot",
  }),
  notes: z.string().optional(),
});

const TestDriveForm = ({ car, testDriveInfo }) => {
  const router = useRouter();
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(testDriveSchema),
    defaultValues: {
      date: undefined,
      timeSlot: undefined,
      notes: "",
    },
  });

  // Custom hooks for API calls
  const {
    loading: bookingInProgress,
    fn: bookTestDriveFn,
    data: bookingResult,
    error: bookingError,
  } = useFetch(bookTestDrive);

  const dealership = testDriveInfo?.dealership;
  const existingBookings = testDriveInfo?.existingBookings || [];
  // Watch date field to update available time slots
  const selectedDate = watch("date");

  const onSubmit = async (data) => {
    const selectedSlot = availableTimeSlots.find(
      (slot) => slot.id === data.timeSlot
    );

    if (!selectedSlot) {
      toast.error("Selected time slot is not available");
      return;
    }

    await bookTestDriveFn({
      carId: car.id,
      bookingDate: format(data.date, "yyyy-MM-dd"),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      notes: data.notes || "",
    });
  };

  const isDayDisabled = (day) => {
    // Disable past dates
    if (day < new Date()) {
      return true;
    }

    // Get day of the week
    const dayOfWeek = format(day, "EEEE").toUpperCase();

    // Find workinghours of the day
    const daySchedule = dealership?.workingHours?.find(
      (schedule) => schedule.dayOfWeek === dayOfWeek
    );

    // disable if dealership is closed on this day
    return !daySchedule || !daySchedule.isOpen;
  };

  useEffect(() => {
    if (!selectedDate || !dealership?.workingHours) return;

    const selectedDayOfWeek = format(selectedDate, "EEEE").toUpperCase();

    // Find working hours for the selected day
    const daySchedule = dealership.workingHours.find(
      (day) => day.dayOfWeek === selectedDayOfWeek
    );

    if (!daySchedule || !daySchedule.isOpen) {
      setAvailableTimeSlots([]);
      return;
    }

    // Parse opening and closing hours
    const openHour = parseInt(daySchedule.openTime.split(":")[0]);
    const closeHour = parseInt(daySchedule.closeTime.split(":")[0]);

    // Generate time slots (every hour)
    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

      // Check if this slot is already booked
      const isBooked = existingBookings.some((booking) => {
        const bookingDate = booking.date;
        return (
          bookingDate === format(selectedDate, "yyyy-MM-dd") &&
          booking.startTime === startTime
        );
      });

      if (!isBooked) {
        slots.push({
          id: `${startTime}-${endTime}`,
          label: `${startTime}-${endTime}`,
          startTime,
          endTime,
        });
      }
    }

    setAvailableTimeSlots(slots);

    // Clear time slot selection when date changes
    setValue("timeSlot", "");
  }, [selectedDate]);

  // Handle booking error
  useEffect(() => {
    if (bookingError) {
      toast.error(
        bookingError.message || "Failed to book test drive. Please try again."
      );
    }
  }, [bookingError]);

  // Handle successful booking
  useEffect(() => {
    if (bookingResult?.success) {
      setBookingDetails({
        date: bookingResult?.data?.bookingDate,
        timeSlot: `${format(
          parseISO(`2022-01-01T${bookingResult?.data?.startTime}`),
          "h:mm a"
        )} - ${format(
          parseISO(`2022-01-01T${bookingResult?.data?.endTime}`),
          "h:mm a"
        )}`,
        notes: bookingResult?.data?.notes,
      });
      setShowConfirmation(true);

      // Reset form
      reset();
    }
  }, [bookingResult, reset]);

  // Close confirmation handler
  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    router.push(`/cars/${car.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
      {/* Left coloumn - car summary */}
      <div className="md:col-span-1">
        {/* Car card */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">تفاصيل السيارة</h2>

            <div className="aspect-video rounded-lg overflow-hidden relative mb-4">
              {car.images && car.images.length > 0 ? (
                <img
                  src={car.images[0]}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold">
              {car.year} {car.make} {car.model}
            </h3>

            <div className="mt-2 text-xl font-bold text-red-600">
              ${car.price.toLocaleString()}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <div className="flex justify-between py-1 border-b">
                <span>المسافة المقطوعة</span>
                <span className="font-medium">
                  {car.mileage.toLocaleString()} ميل
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>نوع الوقود</span>
                <span className="font-medium">{car.fuelType}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>ناقل الحركة</span>
                <span className="font-medium">{car.transmission}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>نوع الهيكل</span>
                <span className="font-medium">{car.bodyType}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>اللون</span>
                <span className="font-medium">{car.color}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Dealership Info */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">معلومات الوكالة</h2>
            <div className="text-sm">
              <p className="font-medium">
                {dealership?.name || "ماكس موتورز"}
              </p>
              <p className="text-gray-600 mt-1">
                {dealership?.address || "العنوان غير متوفر"}
              </p>
              <p className="text-gray-600 mt-3">
                <span className="font-medium">الهاتف:</span>{" "}
                {dealership?.phone || "غير متوفر"}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">البريد الإلكتروني:</span>{" "}
                {dealership?.email || "غير متوفر"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Booking Form */}
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">جدولة تجربة القيادة الخاصة بك</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  اختر تاريخاً
                </label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
className={cn(
  "w-full justify-start text-left font-normal cursor-pointer",
  !field.value && "text-black"
)}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "PPP", { locale: ar })
                              : "اختر تاريخاً"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={isDayDisabled}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.date && (
                        <p className="text-sm font-medium text-red-500 mt-1">
                          {errors.date.message === "Please select a date for your test drive" ? "يرجى اختيار تاريخ لتجربة القيادة" : errors.date.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  اختر فترة زمنية
                </label>
                <Controller
                  name="timeSlot"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={
                          !selectedDate || availableTimeSlots.length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedDate
                                ? "يرجى اختيار التاريخ أولاً"
                                : availableTimeSlots.length === 0
                                ? "لا توجد فترات متاحة في هذا التاريخ"
                                : "اختر فترة زمنية"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.map((slot) => (
                            <SelectItem key={slot.id} value={slot.id}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.timeSlot && (
                        <p className="text-sm font-medium text-red-500 mt-1">
                          {errors.timeSlot.message === "Please select a time slot" ? "يرجى اختيار فترة زمنية" : errors.timeSlot.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  ملاحظات إضافية (اختياري)
                </label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="أي أسئلة أو طلبات محددة لتجربة القيادة؟"
                      className="min-h-24"
                    />
                  )}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={bookingInProgress}
              >
                {bookingInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري حجز تجربة القيادة...
                  </>
                ) : (
                  "احجز تجربة قيادة"
                )}
              </Button>
            </form>

            {/* Instructions */}
            <div className="mt-8 bg-black-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">ما يمكن توقعه</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2 mt-0.5" />
                  احضر رخصة القيادة للتحقق
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2 mt-0.5" />
                  تستمر تجارب القيادة عادة 30-60 دقيقة
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-2 mt-0.5" />
                  سيرافقك ممثل الوكالة
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-md [&>button]:absolute [&>button]:top-4 [&>button]:left-4 [&>button]:right-auto confirmation-dialog" dir="rtl" suppressHydrationWarning>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              تم حجز تجربة القيادة بنجاح
            </DialogTitle>
            <DialogDescription className="text-right">
              تم تأكيد تجربة القيادة الخاصة بك بالتفاصيل التالية:
            </DialogDescription>
          </DialogHeader>

          {bookingDetails && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">السيارة:</span>
                  <span>
                    {car.year} {car.make} {car.model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">التاريخ:</span>
                  <span className="text-white">{
                    typeof bookingDetails.date === "string"
                      ? format(parseISO(bookingDetails.date), "PPP", { locale: ar })
                      : bookingDetails.date instanceof Date
                        ? format(bookingDetails.date, "PPP", { locale: ar })
                        : ""
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">الفترة الزمنية:</span>
                  <span className="text-white">{bookingDetails.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">الوكالة:</span>
                  <span>{dealership?.name || "ماكس موتورز"}</span>
                </div>
              </div>

              <div className="mt-4 bg-red-50 p-3 rounded text-sm text-red-700">
                يرجى الوصول قبل 10 دقائق مع رخصة القيادة.
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleCloseConfirmation}>تم</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestDriveForm;
