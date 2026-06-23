"use client";
import { useEffect, useState } from "react";
import { CarIcon, Heart, Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useRouter } from "next/navigation";
import { toggleSavedCars } from "@/actions/car-listing";
import useFetch from "../../hooks/use-fetch";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import '@abdulrysr/saudi-riyal-new-symbol-font/style.css';
import { formatSaudiRiyalReact } from "@/lib/helper";

const CarCard = ({ car, isFeatured }) => {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    setIsSaved(car.wishliseted);
  }, []);

  // Use the useFetch hook
  const {
    loading: toggleLoading,
    fn: toggleSavedCarFn,
    data: toggleResult,
    error: toggleError,
  } = useFetch(toggleSavedCars);

  // handle success operation
  useEffect(() => {
    if (toggleResult?.success && toggleResult.saved != isSaved) {
      setIsSaved(toggleResult.saved);
      toast.success(toggleResult.message);
    }
  }, [toggleResult, isSaved]);

  // handle error
  useEffect(() => {
    if (toggleError) {
      toast.error("فشل في تحديث المفضلة");
    }
  }, [toggleError]);

  const handleToggleSave = async (e) => {
    e.preventDefault();

    if (!isSignedIn) {
      toast.error("يرجى تسجيل الدخول لحفظ السيارات");
      router.push("/sign-in");
      return;
    }

    await toggleSavedCarFn(car.id);
  };

  return (
    <Card
      className={`overflow-hidden hover:shadow-xl trasition group py-0 shadow-lg border ${
        isFeatured
          ? "bg-zinc-900 border-white/10"
          : "bg-black/30 backdrop-blur-xl bg-white/10 border-white/20"
      }`}
    >
      {/* Car image */}
      <div className="relative h-32 sm:h-40 md:h-56">
        {car.images && car.images.length > 0 ? (
          <div className="relative w-full h-full">
            <Image
              src={car.images[0]}
              alt={`${car.make} ${car.model} `}
              fill
              className="object-cover group-hover:scale-105 trasition duration-300 "
            />
          </div>
        ) : (
          <div className="w-full h-full bg-grey-200 flex items-center justify-center">
            <CarIcon className="h-12 w-12 text-grey-400" />
          </div>
        )}
        {/*  Wishist button */}
        {isFeatured ? (
          <></>
        ) : (
          <Button
            onClick={handleToggleSave}
            variant="ghost"
            size="icon"
            className={`absolute top-2 left-2 bg-black/50 rounded-full p-1.5`}
          >
            {toggleLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                fill={isSaved ? "currentColor" : "none"}
                className={`h-5 w-5 ${isSaved
                  ? "text-red-500 hover:text-red-600"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              />
            )}
          </Button>
        )}
      </div>

      {/* Card content */}
      <CardContent className="p-2.5 sm:p-3 md:p-4">
        <div className="flex flex-col mb-1.5 md:mb-2">
          <h3 className="text-sm sm:text-base md:text-lg font-bold line-clamp-1">
            {car.make} {car.model}
          </h3>
          <span className="text-base sm:text-lg md:text-xl font-bold text-white">
            {formatSaudiRiyalReact(car.price)}
          </span>
        </div>

        {/* Car details (badges)etc */}
        <div className="text-white mb-1.5 md:mb-2 flex items-center text-xs sm:text-sm">
          <span>{car.year}</span>
          <span className="mx-2">•</span>
          <span>{car.transmission}</span>
          <span className="mx-2">•</span>
          <span>{car.fuelType}</span>
        </div>

        <div className="hidden sm:flex flex-wrap gap-1 mb-3 md:mb-4">
          {car.isLuxury && (
            <Badge className="bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-600">
              فارهة
            </Badge>
          )}

          <Badge variant="outline" className="bg-black/30">
            {car.bodyType}
          </Badge>

          {car.driveType && (
            <Badge variant="outline" className="bg-black/30">
              {car.driveType}
            </Badge>
          )}

          <Badge variant="outline" className="bg-black/30">
            {car.mileage.toLocaleString()} ميل
          </Badge>

          {!isFeatured && (
            <Badge variant="outline" className="bg-black/30">
              {car.color}
            </Badge>
          )}
        </div>

        {!isFeatured && (
          <div className="flex justify-between">
            <Link
              href={`/cars/${car.id}`}
              className="flex-1 inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium h-8 sm:h-9 md:h-10 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('startLoading'));
              }}
            >
              عرض السيارة
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CarCard;
