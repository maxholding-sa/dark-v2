"use client";
import { getCarsByFilters } from "@/actions/car-listing";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import useFetch from "../../../../../hooks/use-fetch";
import CarsListingLoading from "./CarsListingLoading";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CarCard from "@/components/CarCard";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const CarListings = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 6;

  // Extract filter values from searchParams
  const search = searchParams.get("search") || "";
  const make = searchParams.get("make") || "";
  const bodyType = searchParams.get("bodyType") || "";
  const fuelType = searchParams.get("fuelType") || "";
  const transmission = searchParams.get("transmission") || "";
  const minPrice = searchParams.get("minPrice") || 0;
  const maxPrice = searchParams.get("maxPrice") || Number.MAX_SAFE_INTEGER;
  const sortBy = searchParams.get("sortBy") || "newest";
  const page = parseInt(searchParams.get("page") || "1");

  // cuotom hook to fetch cars
  const {
    loading: getCarsLoading,
    fn: fecthCarsFn,
    data: carsData,
    error: fetchCarsError,
  } = useFetch(getCarsByFilters);

  // Fetch cars when filters change
  useEffect(() => {
    fecthCarsFn({
      search,
      make,
      bodyType,
      fuelType,
      transmission,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
    });
  }, [
    search,
    make,
    bodyType,
    fuelType,
    transmission,
    minPrice,
    maxPrice,
    sortBy,
    page,
  ]);

  // Update URL when page changes
  useEffect(() => {
    if (currentPage !== page) {
      const params = new URLSearchParams(searchParams);
      params.set("page", currentPage.toString());
      router.push(`?${params.toString()}`);
    }
  }, [currentPage, router, searchParams, page]);

  // Handle pagination clicks
  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
  };

  // Generate pagination URL
  const getPaginationUrl = (pageNum) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNum.toString());
    return `?${params.toString()}`;
  };

  // Loading skaleton
  if (getCarsLoading && carsData) {
    return <CarsListingLoading />;
  }

  // Error if unable to fetch cars data
  if (fetchCarsError || (!getCarsLoading && !carsData)) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          فشل تحميل السيارات. يرجى المحاولة مرة أخرى لاحقاً.
        </AlertDescription>
      </Alert>
    );
  }

  if (!carsData || !carsData.success || !carsData.data) {
    return null;
  }

  const { data: cars, pagination } = carsData;
  // console.log(carsData);

  // No results then show
  if (cars.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-gray-50">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Info className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">لم يتم العثور على سيارات</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          لم نتمكن من العثور على أي سيارات تطابق معايير البحث الخاصة بك. جرب تعديل الفلاتر أو مصطلح البحث.
        </p>
        <Button variant="outline" asChild>
          <Link href="/cars">مسح جميع الفلاتر</Link>
        </Button>
      </div>
    );
  }

  // Generate pagination items
  const paginationItems = [];

  // Calculate which page numbers to show (first, last, and around current page)
  const visiblePageNumbers = [];

  // Always show page 1
  visiblePageNumbers.push(1);

  // Show pages around current page
  for (
    let i = Math.max(2, page - 1);
    i <= Math.min(pagination.pages - 1, page + 1);
    i++
  ) {
    visiblePageNumbers.push(i);
  }

  // Always show last page if there's more than 1 page
  if (pagination.pages > 1) {
    visiblePageNumbers.push(pagination.pages);
  }

  // Sort and deduplicate
  const uniquePageNumbers = [...new Set(visiblePageNumbers)].sort(
    (a, b) => a - b
  );

  // Create pagination items with ellipses
  let lastPageNumber = 0;
  uniquePageNumbers.forEach((pageNumber) => {
    if (pageNumber - lastPageNumber > 1) {
      // Add ellipsis
      paginationItems.push(
        <PaginationItem key={`ellipsis-${pageNumber}`}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    paginationItems.push(
      <PaginationItem key={pageNumber}>
        <PaginationLink
          href={getPaginationUrl(pageNumber)}
          isActive={pageNumber === page}
          onClick={(e) => {
            e.preventDefault();
            handlePageChange(pageNumber);
          }}
        >
          {pageNumber}
        </PaginationLink>
      </PaginationItem>
    );

    lastPageNumber = pageNumber;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          عرض{" "}
          <span className="font-medium">
            {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)}
          </span>{" "}
          من <span className="font-medium">{pagination.total}</span> سيارة
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {cars?.map((car) => {
          return <CarCard key={car.id} car={car} />;
        })}
      </div>

      {/* shadcn Pagination */}
      {pagination.pages > 1 && (
        <Pagination className="mt-10">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={getPaginationUrl(page - 1)}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) {
                    handlePageChange(page - 1);
                  }
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {paginationItems}

            <PaginationItem>
              <PaginationNext
                href={getPaginationUrl(page + 1)}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pagination.pages) {
                    handlePageChange(page + 1);
                  }
                }}
                className={
                  page >= pagination.pages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default CarListings;
