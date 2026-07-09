"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Sliders, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CarFiltersControl from "./CarFiltersControl";

const CarFilters = ({ filters }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  //Get current filter values from searchParams
  const currentMake = searchParams.get("make") || "";
  const currentBodyType = searchParams.get("bodyType") || "";
  const currentFuelType = searchParams.get("fuelType") || "";
  const currentTransmission = searchParams.get("transmission") || "";
  const currentMinPrice = searchParams.get("minPrice")
    ? parseInt(searchParams.get("minPrice"))
    : filters?.data.priceRange.min;

  const currentMaxPrice = searchParams.get("maxPrice")
    ? parseInt(searchParams.get("maxPrice"))
    : filters?.data.priceRange.max;
  const currentSortBy = searchParams.get("sortBy") || "newest";

  // Local state for filters
  const [make, setMake] = useState(currentMake);
  const [bodyType, setBodyType] = useState(currentBodyType);
  const [fuelType, setFuelType] = useState(currentFuelType);
  const [transmission, setTransmission] = useState(currentTransmission);
  const [priceRange, setPriceRange] = useState([
    currentMinPrice,
    currentMaxPrice,
  ]);
  const [sortBy, setSortBy] = useState(currentSortBy);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Update local state when URL parameters change
  useEffect(() => {
    setMake(currentMake);
    setBodyType(currentBodyType);
    setFuelType(currentFuelType);
    setTransmission(currentTransmission);
    setPriceRange([currentMinPrice, currentMaxPrice]);
    setSortBy(currentSortBy);
  }, [
    currentMake,
    currentBodyType,
    currentFuelType,
    currentTransmission,
    currentMinPrice,
    currentMaxPrice,
    currentSortBy,
  ]);

  const activeFilterCount = [
    make,
    bodyType,
    fuelType,
    transmission,
    currentMinPrice > filters.data.priceRange.min ||
      currentMaxPrice < filters.data.priceRange.max,
  ].filter(Boolean).length;

  const currentFilters = {
    make,
    bodyType,
    fuelType,
    transmission,
    priceRange,
    priceRangeMin: filters?.data.priceRange.min,
    priceRangeMax: filters?.data.priceRange.max,
  };

  // handle filter change
  const handleFilterChange = (filterName, value) => {
    switch (filterName) {
      case "make":
        setMake(value);
        break;
      case "fuelType":
        setFuelType(value);
        break;
      case "bodyType":
        setBodyType(value);
        break;
      case "transmission":
        setTransmission(value);
        break;
      case "priceRange":
        setPriceRange(value);
        break;
    }
  };

  // clear filters
  const handleClearFilter = (filterName) => {
    handleFilterChange(filterName, "");
  };

  // clear all filters
  const clearAllfilters = () => {
    setMake("");
    setBodyType("");
    setFuelType("");
    setTransmission("");
    setPriceRange([filters.data.priceRange.min, filters.data.priceRange.max]);
    setSortBy("newest");

    const params = new URLSearchParams();
    const search = searchParams.get("search");
    if (search) params.set("search", search);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    router.push(url);
    setIsSheetOpen(false);
  };

  // handle sort change
  const handleSortChange = (value) => {
    setSortBy(value);
    const params = new URLSearchParams(searchParams);
    params.set("sortBy", value);

    const search = searchParams.get("search");
    const page = searchParams.get("page");

    if (search) params.set("search", search);
    if (page && page !== "1") params.set("page", page);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    router.push(url);
  };

  // apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    if (bodyType) params.set("bodyType", bodyType);
    if (fuelType) params.set("fuelType", fuelType);
    if (transmission) params.set("transmission", transmission);
    if (priceRange[0] > filters.data.priceRange.min) {
      params.set("minPrice", priceRange[0].toString());
    }
    if (priceRange[1] < filters.data.priceRange.max) {
      params.set("maxPrice", priceRange[1].toString());
    }
    if (sortBy) params.set("sortBy", sortBy);

    const search = searchParams.get("search");
    const page = searchParams.get("page");

    if (search) params.set("search", search);
    if (page && page !== "1") params.set("page", page);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    router.push(url);
    setIsSheetOpen(false);
  };

  return (
    <div className="flex lg:flex-col justify-between gap-4">
      {/* mobile view */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-black text-white border-gray-800 hover:bg-gray-900 hover:text-white">
                <Filter className="h-4 w-4" /> الفلاتر
                {activeFilterCount > 0 && (
                  <Badge className="mr-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-600 text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md overflow-y-auto bg-black text-white border-gray-800"
            >
              <SheetHeader>
                <SheetTitle className="text-white">الفلاتر</SheetTitle>
              </SheetHeader>

              {/* Car filters control */}
              <div className="py-6">
                <CarFiltersControl
                  filters={filters}
                  currentFilters={currentFilters}
                  onFilterChange={handleFilterChange}
                  onClearFilter={handleClearFilter}
                />
              </div>

              {/* Buttons */}
              <SheetFooter className="sm:justify-between flex-row pt-2 border-t border-gray-800 space-m-4 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAllfilters}
                  className="flex-1 bg-transparent text-white border-gray-700 hover:bg-gray-900"
                >
                  إعادة تعيين
                </Button>
                <Button type="button" onClick={applyFilters} className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700">
                  تطبيق الفلاتر
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* sort seletion */}
      <Select
        value={sortBy}
        onValueChange={handleSortChange}
        dir="rtl"
      >
        <SelectTrigger className="w-[180px] lg:w-full bg-black text-white border-gray-800">
          <SelectValue placeholder="ترتيب حسب" />
        </SelectTrigger>
        <SelectContent dir="rtl" className="bg-black text-white border-gray-800">
          {[
            { value: "newest", label: "الأحدث أولاً" },
            { value: "priceAsc", label: "السعر: من الأقل إلى الأعلى" },
            { value: "priceDesc", label: "السعر: من الأعلى إلى الأقل" },
          ].map((option) => (
            <SelectItem key={option.value} value={option.value} className="hover:bg-yellow-200 hover:text-white data-[state=checked]:bg-yellow-600 data-[state=checked]:text-white focus:bg-yellow-600 focus:text-white">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Desktop Filters */}
      <div className="hidden lg:block sticky top-24">
        <div className="border border-gray-800 rounded-lg overflow-hidden bg-black">
          {/* Sliders */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-medium flex items-center text-white">
              <Sliders className="ml-2 h-4 w-4" />
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm text-gray-400 hover:text-white hover:bg-gray-900"
                  onClick={clearAllfilters}
                >
                  <X className="ml-1 h-3 w-3" />
                  مسح الكل
                </Button>
              )}
            </h3>
          </div>

          {/* Car filters control */}
          <div className="py-6">
            <CarFiltersControl
              filters={filters}
              currentFilters={currentFilters}
              onFilterChange={handleFilterChange}
              onClearFilter={handleClearFilter}
            />
          </div>

          <div className="px-4 py-4 border-t border-gray-800">
            <Button onClick={applyFilters} className="w-full bg-yellow-600 text-black hover:bg-yellow-700">
              تطبيق الفلاتر
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarFilters;