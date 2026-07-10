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
import { ArrowUpDown, Filter, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CarFiltersControl from "./CarFiltersControl";

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "priceAsc", label: "السعر: من الأقل إلى الأعلى" },
  { value: "priceDesc", label: "السعر: من الأعلى إلى الأقل" },
];

const CarFilters = ({ filters }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [dynamicFilters, setDynamicFilters] = useState(filters);
  const [filtersLoading, setFiltersLoading] = useState(false);

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

  useEffect(() => {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    if (bodyType) params.set("bodyType", bodyType);
    if (fuelType) params.set("fuelType", fuelType);
    if (transmission) params.set("transmission", transmission);

    const hasSelections = make || bodyType || fuelType || transmission;

    if (!hasSelections) {
      setDynamicFilters(filters);
      return;
    }

    const controller = new AbortController();
    setFiltersLoading(true);

    fetch(`/api/cars/filters?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setDynamicFilters({ success: true, data: result.data });

          setPriceRange((prev) => {
            const newMin = result.data.priceRange.min;
            const newMax = result.data.priceRange.max;
            return [
              Math.max(newMin, Math.min(prev[0], newMax)),
              Math.min(newMax, Math.max(prev[1], newMin)),
            ];
          });
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch dynamic filters:", err);
        }
      })
      .finally(() => setFiltersLoading(false));

    return () => controller.abort();
  }, [make, bodyType, fuelType, transmission, filters]);

  const isPriceFiltered =
    currentMinPrice > filters.data.priceRange.min ||
    currentMaxPrice < filters.data.priceRange.max;

  const activeFilterCount = [
    make,
    bodyType,
    fuelType,
    transmission,
    isPriceFiltered,
  ].filter(Boolean).length;

  const hasPendingChanges =
    make !== currentMake ||
    bodyType !== currentBodyType ||
    fuelType !== currentFuelType ||
    transmission !== currentTransmission ||
    priceRange[0] !== currentMinPrice ||
    priceRange[1] !== currentMaxPrice;

  const currentFilters = {
    make,
    bodyType,
    fuelType,
    transmission,
    priceRange,
    priceRangeMin: dynamicFilters?.data?.priceRange?.min ?? filters?.data.priceRange.min,
    priceRangeMax: dynamicFilters?.data?.priceRange?.max ?? filters?.data.priceRange.max,
  };

  const handleFilterChange = (filterName, value) => {
    switch (filterName) {
      case "make":
        setMake(value);
        if (value !== make) {
          setBodyType("");
          setFuelType("");
          setTransmission("");
        }
        break;
      case "fuelType":
        setFuelType(value);
        if (value !== fuelType) {
          setTransmission("");
        }
        break;
      case "bodyType":
        setBodyType(value);
        if (value !== bodyType) {
          setFuelType("");
          setTransmission("");
        }
        break;
      case "transmission":
        setTransmission(value);
        break;
      case "priceRange":
        setPriceRange(value);
        break;
    }
  };

  const handleClearFilter = (filterName) => {
    handleFilterChange(filterName, "");
  };

  const buildUrl = (overrides = {}) => {
    const params = new URLSearchParams();

    const values = {
      make,
      bodyType,
      fuelType,
      transmission,
      priceRange,
      sortBy,
      ...overrides,
    };

    if (values.make) params.set("make", values.make);
    if (values.bodyType) params.set("bodyType", values.bodyType);
    if (values.fuelType) params.set("fuelType", values.fuelType);
    if (values.transmission) params.set("transmission", values.transmission);
    if (values.priceRange[0] > (dynamicFilters?.data?.priceRange?.min ?? filters.data.priceRange.min)) {
      params.set("minPrice", values.priceRange[0].toString());
    }
    if (values.priceRange[1] < (dynamicFilters?.data?.priceRange?.max ?? filters.data.priceRange.max)) {
      params.set("maxPrice", values.priceRange[1].toString());
    }
    if (values.sortBy) params.set("sortBy", values.sortBy);

    const search = searchParams.get("search");
    const page = searchParams.get("page");
    if (search) params.set("search", search);
    if (page && page !== "1") params.set("page", page);

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const clearAllfilters = () => {
    setMake("");
    setBodyType("");
    setFuelType("");
    setTransmission("");
    setPriceRange([filters.data.priceRange.min, filters.data.priceRange.max]);
    setDynamicFilters(filters);
    setSortBy("newest");

    const params = new URLSearchParams();
    const search = searchParams.get("search");
    if (search) params.set("search", search);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    router.push(url);
    setIsSheetOpen(false);
  };

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

  const applyFilters = () => {
    router.push(buildUrl());
    setIsSheetOpen(false);
  };

  const sortSelect = (
    <Select value={sortBy} onValueChange={handleSortChange} dir="rtl">
      <SelectTrigger className="w-full bg-black text-white border-gray-800 h-10 text-start">
        <div className="flex items-center gap-2">
          <SelectValue placeholder="ترتيب حسب" />
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent dir="rtl" className="bg-black text-white border-gray-800">
        {SORT_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-start justify-start hover:bg-yellow-600/20 hover:text-white data-[state=checked]:bg-yellow-600 data-[state=checked]:text-white focus:bg-yellow-600 focus:text-white"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const applyButton = (
    <Button
      type="button"
      onClick={applyFilters}
      disabled={!hasPendingChanges}
      className="w-full bg-yellow-600 text-black hover:bg-yellow-500 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {hasPendingChanges ? "تطبيق الفلاتر" : "تم التطبيق"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile toolbar */}
      <div className="lg:hidden flex items-center gap-3">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white border-gray-800 hover:bg-gray-900 hover:text-white h-10"
            >
              <Filter className="h-4 w-4" />
              الفلاتر
              {activeFilterCount > 0 && (
                <Badge className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center bg-yellow-600 text-black text-[10px] font-bold">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:max-w-md flex flex-col bg-black text-white border-gray-800 p-0"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-yellow-500" />
                  تصفية النتائج
                </SheetTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllfilters}
                    className="text-gray-400 hover:text-white hover:bg-gray-900 h-8 text-xs"
                  >
                    <X className="ml-1 h-3 w-3" />
                    مسح الكل
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto py-2">
              <CarFiltersControl
                filters={dynamicFilters}
                currentFilters={currentFilters}
                onFilterChange={handleFilterChange}
                onClearFilter={handleClearFilter}
                loading={filtersLoading}
              />
            </div>

            <SheetFooter className="px-6 py-4 border-t border-gray-800 flex-row gap-3 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={clearAllfilters}
                className="flex-1 bg-transparent text-white border-gray-700 hover:bg-gray-900 h-10"
              >
                إعادة تعيين
              </Button>
              <Button
                type="button"
                onClick={applyFilters}
                disabled={!hasPendingChanges}
                className="flex-1 bg-yellow-600 text-black hover:bg-yellow-500 h-10 disabled:opacity-40"
              >
                {hasPendingChanges ? "عرض النتائج" : "تم التطبيق"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <div className="flex-1">{sortSelect}</div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col gap-4 sticky top-24">
        {sortSelect}

        <div className="border border-gray-800 rounded-xl overflow-hidden bg-black">
          <div className="px-4 py-3.5 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-medium flex items-center gap-2 text-white text-sm">
              <SlidersHorizontal className="h-4 w-4 text-yellow-500" />
              تصفية النتائج
              {activeFilterCount > 0 && (
                <Badge className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center bg-yellow-600 text-black text-[10px] font-bold">
                  {activeFilterCount}
                </Badge>
              )}
            </h3>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-900"
                onClick={clearAllfilters}
              >
                <X className="ml-1 h-3 w-3" />
                مسح الكل
              </Button>
            )}
          </div>

          <div className="py-2">
            <CarFiltersControl
              filters={dynamicFilters}
              currentFilters={currentFilters}
              onFilterChange={handleFilterChange}
              onClearFilter={handleClearFilter}
              loading={filtersLoading}
            />
          </div>

          <div className="px-4 py-4 border-t border-gray-800">{applyButton}</div>
        </div>
      </div>
    </div>
  );
};

export default CarFilters;
