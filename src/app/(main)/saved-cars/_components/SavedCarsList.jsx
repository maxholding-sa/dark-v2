"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import CarCard from "@/components/CarCard";

export function SavedCarsList({ initialData }) {
  // No saved cars
  if (!initialData?.data || initialData?.data.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-gray-50">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Heart className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">لا توجد سيارات محفوظة</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          لم تقم بحفظ أي سيارات بعد. تصفح قوائمنا وانقر على أيقونة القلب لحفظ السيارات للوقت لاحقاً.
        </p>
        <Button variant="default" asChild>
          <Link href="/cars">تصفح السيارات</Link>
        </Button>
      </div>
    );
  }
  // Display saved cars
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
      {initialData?.data?.map((car) => (
        <CarCard key={car.id} car={{ ...car }} />
      ))}
    </div>
  );
}
