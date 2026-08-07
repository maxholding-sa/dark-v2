"use client";

import { toggleSavedCars } from "@/actions/car-listing";
import { Button } from "@/components/ui/button";
import { formatSaudiRiyalReact } from "@/lib/helper";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Car,
  Fuel,
  Gauge,
  LocateFixed,
  Share2,
  Heart,
  MessageSquare,
  Currency,
  AlertCircle,
  Calendar,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import MandebSelector from "./MandebSelector";
import ImageLightbox from "./ImageLightbox";
import CarCard from "@/components/CarCard";

const CarDetails = ({ car, testDriveInfo, similarCars = [] }) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const [isWishlisted, setIsWishlisted] = useState(car.wishliseted);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
  const [carUrl, setCarUrl] = useState('');
  const [isMandebDialogOpen, setIsMandebDialogOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const priorityLabel = car.isLuxury ? "فاخرة" : car.featured ? "مميزة" : null;

  // Helper function to extract YouTube video ID and generate embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    if (match) {
      const videoId = match[1];
      const params = 'modestbranding=1&rel=0&iv_load_policy=3&fs=0&cc_load_policy=0&autohide=1&showinfo=0';
      return `https://www.youtube.com/embed/${videoId}?${params}`;
    }
    return null;
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  };

  const isYouTubeUrl = (url) => {
    return getYouTubeEmbedUrl(url) !== null;
  };

  const getVideoThumbnail = (videoUrl) => {
    return "/logo.png";
  };

  useEffect(() => {
    setCarUrl(window.location.href);
  }, []);

  //   custom fetch hook
  const {
    loading: savingCarLoading,
    fn: toggleSavedCarFn,
    data: toggleResult,
    error: toggleError,
  } = useFetch(toggleSavedCars);

  // Handle toggle result with useEffect
  useEffect(() => {
    if (toggleResult?.success) {
      setIsWishlisted(toggleResult.saved);
      toast.success(toggleResult.message);
    }
  }, [toggleResult]);

  // Handle errors with useEffect
  useEffect(() => {
    if (toggleError) {
      toast.error("Failed to update favorites");
    }
  }, [toggleError]);

  // Handle save car
  const handleSaveCar = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to save cars");
      router.push("/sign-in");
      return;
    }

    if (savingCarLoading) return;

    // Use the toggleSavedCarFn from useFetch hook
    await toggleSavedCarFn(car.id);
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${car.year} ${car.make} ${car.model}`,
          text: `شاهد ${car.year} ${car.make} ${car.model} على ماكس موتورز`,
          url: window.location.href,
        })
        .catch(() => {
          copyToClipboard();
        });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleBookTestDrive = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to book a test drive");
      router.push("/sign-in");
      return;
    }

    window.dispatchEvent(new CustomEvent('startLoading'));
    router.push(`/test-drive/${car.id}`);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:gap-16">
        {/*Lefts side- Image Gallery ,seconaday actions*/}
        <div className="w-full lg:w-6/12 lg:ml-8">
          <div className="aspect-video rounded-lg overflow-hidden relative mb-4">
            {mediaType === 'video' && car.videoUrl ? (
              isYouTubeUrl(car.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(car.videoUrl)}
                  title={`${car.year} ${car.make} ${car.model} video`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={car.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                  poster={car.images && car.images.length > 0 ? car.images[0] : undefined}
                />
              )
            ) : car.images && car.images.length > 0 ? (
              <div
                className="w-full h-full cursor-pointer group"
                onClick={() => setIsLightboxOpen(true)}
              >
                <Image
                  src={car.images[currentImageIndex]}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    اضغط لعرض الصورة
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Car className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {(car.images && car.images.length > 1) || car.videoUrl ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {car.images && car.images.map((image, index) => (
                <div
                  key={`image-${index}`}
                  className={`relative cursor-pointer rounded-md h-20 w-24 flex-shrink-0 transition ${mediaType === 'image' && index === currentImageIndex
                    ? "border-2 border-gold"
                    : "opacity-70 hover:opacity-100"
                    }`}
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setMediaType('image');
                  }}
                >
                  <Image
                    src={image}
                    alt={`${car.year} ${car.make} ${car.model} - view ${index + 1
                      }`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {car.videoUrl && (
                <div
                  className={`relative cursor-pointer rounded-md h-20 w-24 flex-shrink-0 transition ${mediaType === 'video'
                    ? "border-2 border-gold"
                    : "opacity-70 hover:opacity-100"
                    }`}
                  onClick={() => setMediaType('video')}
                >
                  <Image
                    src={getVideoThumbnail(car.videoUrl)}
                    alt={`${car.year} ${car.make} ${car.model} - video`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white bg-black bg-opacity-50 rounded-full p-1" />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 md:flex mt-4 gap-2 md:gap-4">
            {/* Saved */}
            <Button
              variant="outline"
              className={`flex items-center justify-center gap-2 flex-1 ${isWishlisted ? "text-gold" : ""
                }`}
              onClick={handleSaveCar}
              disabled={savingCarLoading}
            >
              <Heart
                className={`h-4 w-4 md:h-5 md:w-5 ${isWishlisted ? "fill-gold" : ""}`}
              />
              <span className="text-xs md:text-sm">{isWishlisted ? "محفوظة" : "حفظ"}</span>
            </Button>
            {/* Share */}
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 flex-1"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">مشاركة</span>
            </Button>
            {/* Loan Request */}
            <Button
              variant="default"
              className="flex items-center justify-center gap-2 bg-gold-dark text-white hover:bg-gold-dark font-bold flex-1"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('startLoading'));
                router.push(`/loan-request/${car.id}`);
              }}
            >
              <Currency className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">طلب قرض</span>
            </Button>
            {/* Order Car (Mandeb selection) */}
            <Button
              variant="default"
              className="flex items-center justify-center gap-2 bg-gold-dark text-white hover:bg-gold-dark font-bold flex-1"
              onClick={() => setIsMandebDialogOpen(true)}
            >
              <Car className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">طلب السيارة</span>
            </Button>
          </div>
        </div>

        {/* Car Details */}
        <div className="w-full lg:w-5/12 sm:mt-4 lg:mt-0 mx-0">
          <div className="flex items-center gap-2">
            <Badge className="mb-2 mt-2 sm:mt-0">{car.bodyType}</Badge>
            {priorityLabel && (
              <Badge className="mb-2 mt-2 sm:mt-0 bg-gold text-black hover:bg-gold font-bold">
                سيارة {priorityLabel}
              </Badge>
            )}
          </div>

          <h1 className="text-4xl font-bold mb-1">
            {car.year} {car.make} {car.model}
            {car.category ? ` - ${car.category}` : ""}
          </h1>

          <div className="text-2xl font-bold text-gold">
            {formatSaudiRiyalReact(car.price)}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
            <div className="flex items-center gap-2">
              <Gauge className="text-gray-500 h-5 w-5" />
              <span>{car.mileage.toLocaleString()} ميل</span>
            </div>
            <div className="flex items-center gap-2">
              <Fuel className="text-gray-500 h-5 w-5" />
              <span>{car.fuelType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="text-gray-500 h-5 w-5" />
              <span>{car.transmission}</span>
            </div>
            {car.driveType && (
              <div className="flex items-center gap-2">
                <LocateFixed className="text-gray-500 h-5 w-5" />
                <span>{car.driveType}</span>
              </div>
            )}
          </div>

          {/* Emi Calculator */}
          <Card
            className="pt-5 cursor-pointer hover:border-gold transition-colors"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('startLoading'));
              router.push(`/loan-request/${car.id}`);
            }}
          >
            <CardContent>
              <div className="flex items-center gap-2 text-lg font-medium mb-2">
                <Currency className="h-5 w-5 text-gold" />
                <h3>حاسبة الأقساط الشهرية</h3>
              </div>
              <div className="text-sm text-gray-600">
                القسط الشهري المتوقع: حوالي
                <span className="font-bold text-gold-dark">
                  {" "}
                  {formatSaudiRiyalReact(car.price / 60)}
                </span>{" "}
                لمدة 60 شهراً
              </div>
              <div className="text-xs text-gray-500 mt-1">
                اطلب قرضك الان
              </div>
            </CardContent>
          </Card>

          {/* Request More Info */}
          <Card className="my-6 ">
            <CardContent className="p-4 ">
              <div className="flex items-center gap-2 text-lg font-medium mb-2">
                <MessageSquare className="h-5 w-5 text-gold" />
                <h3>لديك أسئلة؟</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                ممثلونا متاحون للإجابة على جميع استفساراتك حول هذه السيارة.
              </p>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => setIsMandebDialogOpen(true)}
              >
                طلب معلومات
              </Button>
            </CardContent>
          </Card>

          {/* if car is sold or unavailable */}
          {(car.status === "SOLD" || car.status === "UNAVAILABLE") && (
            <Alert variant="destructive">
              <AlertTitle className="capitalize">
                هذه السيارة {car.status === "SOLD" ? "مباعة" : "غير متاحة"}
              </AlertTitle>
              <AlertDescription>يرجى المراجعة مرة أخرى لاحقاً.</AlertDescription>
            </Alert>
          )}

          {/* Book test drive */}
          {car.status !== "SOLD" && car.status !== "UNAVAILABLE" && car.testDriveAvailable && (
            <Button
              className="w-full py-6 text-lg"
              onClick={handleBookTestDrive}
              disabled={testDriveInfo.userTestDrive}
            >
              <Calendar className="ml-2 h-5 w-5" />
              {testDriveInfo.userTestDrive
                ? `محجوز لتاريخ ${format(
                  new Date(testDriveInfo.userTestDrive.bookingDate),
                  "EEEE، d MMMM yyyy"
                )}`
                : "احجز اختبار قيادة"}
            </Button>
          )}
        </div>
      </div>

      {/* Details & Features Section */}
      <div className="mt-12 p-6 bg-black rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">الوصف</h3>
            <p className="whitespace-pre-line text-white-700">
              {car.description}
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">المواصفات</h3>
            <ul className="grid grid-cols-1 gap-2">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-gold rounded-full"></span>
                {car.transmission} ناقل الحركة
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-gold rounded-full"></span>
                {car.fuelType} محرك
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-gold rounded-full"></span>
                {car.bodyType} نوع الهيكل
              </li>
              {car.driveType && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-gold rounded-full"></span>
                  {car.driveType} نوع الدفع
                </li>
              )}
              {car.seats && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-gold rounded-full"></span>
                  {car.seats} مقاعد
                </li>
              )}
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-gold rounded-full"></span>
                {car.color} لون خارجي
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Specifications Section */}
      <div className="mt-8 p-6 bg-black rounded-lg shadow-sm ">
        <h2 className="text-2xl font-bold mb-6">المواصفات التفصيلية</h2>
        <div className="bg-black-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-16">
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">الماركة</span>
              <span className="font-medium">{car.make}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">الموديل</span>
              <span className="font-medium">{car.model}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">السنة</span>
              <span className="font-medium">{car.year}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">نوع الهيكل</span>
              <span className="font-medium">{car.bodyType}</span>
            </div>
            {car.category && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-white-600">الفئة</span>
                <span className="font-medium">{car.category}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">نوع الوقود</span>
              <span className="font-medium">{car.fuelType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">ناقل الحركة</span>
              <span className="font-medium">{car.transmission}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">المسافة المقطوعة</span>
              <span className="font-medium">
                {car.mileage.toLocaleString()} ميل
              </span>
            </div>
            {car.driveType && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-white-600">نوع الدفع</span>
                <span className="font-medium">{car.driveType}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-white-600">اللون</span>
              <span className="font-medium">{car.color}</span>
            </div>
            {car.seats && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-white-600">المقاعد</span>
                <span className="font-medium">{car.seats}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dealership Location Section */}
      <div className="mt-8 p-6 bg-black rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-6">موقع المعرض</h2>
        <div className="bg-black-50 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            {/* Dealership Name and Address */}
            <div className="flex items-start gap-3">
              <LocateFixed className="h-5 w-5 text-white-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium">{testDriveInfo.dealership?.name || "ماكس موتورز"}</h4>
                <p className="text-white-600">
                  {testDriveInfo.dealership?.address || "غير متاح"}
                </p>
                <p className="text-white-600 mt-1">
                  هاتف: {testDriveInfo.dealership?.phone || "غير متاح"}
                </p>
                <p className="text-white-600">
                  بريد إلكتروني: {testDriveInfo.dealership?.email || "غير متاح"}
                </p>
              </div>
            </div>

            {/* Working Hours */}
            <div className="md:w-1/2 lg:w-1/3">
              <h4 className="font-medium mb-2">ساعات العمل</h4>
              <div className="space-y-2">
                {testDriveInfo.dealership?.workingHours
                  ? testDriveInfo.dealership.workingHours
                    .sort((a, b) => {
                      const days = [
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                        "SATURDAY",
                        "SUNDAY",
                      ];
                      return (
                        days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek)
                      );
                    })
                    .map((day) => {
                      const arabicDays = {
                        MONDAY: "الإثنين",
                        TUESDAY: "الثلاثاء",
                        WEDNESDAY: "الأربعاء",
                        THURSDAY: "الخميس",
                        FRIDAY: "الجمعة",
                        SATURDAY: "السبت",
                        SUNDAY: "الأحد"
                      };
                      return (
                        <div
                          key={day.dayOfWeek}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-white-600">
                            {arabicDays[day.dayOfWeek]}
                          </span>
                          <span>
                            {day.isOpen
                              ? `${day.openTime} - ${day.closeTime}`
                              : "مغلق"}
                          </span>
                        </div>
                      );
                    })
                  : // Default hours if none provided
                  [
                    { day: "الإثنين", hours: "9:00 - 18:00" },
                    { day: "الثلاثاء", hours: "9:00 - 18:00" },
                    { day: "الأربعاء", hours: "9:00 - 18:00" },
                    { day: "الخميس", hours: "9:00 - 18:00" },
                    { day: "الجمعة", hours: "9:00 - 18:00" },
                    { day: "السبت", hours: "10:00 - 16:00" },
                    { day: "الأحد", hours: "مغلق" },
                  ].map((item) => (
                    <div key={item.day} className="flex justify-between text-sm">
                      <span className="text-white-600">{item.day}</span>
                      <span>{item.hours}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarCars.length > 0 && (
        <div className="mt-8 p-6 bg-black rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-6">سيارات مشابهة</h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {similarCars.map((similarCar) => (
              <CarCard key={similarCar.id} car={similarCar} />
            ))}
          </div>
        </div>
      )}

      <MandebSelector
        isOpen={isMandebDialogOpen}
        onOpenChange={setIsMandebDialogOpen}
        car={car}
      />

      {/* Fullscreen Image Lightbox */}
      <ImageLightbox
        images={car.images}
        initialIndex={currentImageIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};
export default CarDetails;
