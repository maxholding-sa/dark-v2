"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
const FILTER_LABELS = {
  make: "الماركة",
  bodyType: "نوع الهيكل",
  fuelType: "نوع الوقود",
  transmission: "ناقل الحركة",
  search: "بحث",
  isEconomic: "اقتصادية",
  isCommercial: "تجارية",
  color: "اللون",
};

const ActiveFilterChips = ({ priceRange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters = [];

  const addFilter = (key, label, value) => {
    if (value) activeFilters.push({ key, label, value });
  };

  addFilter("search", FILTER_LABELS.search, searchParams.get("search"));
  addFilter("make", FILTER_LABELS.make, searchParams.get("make"));
  addFilter("bodyType", FILTER_LABELS.bodyType, searchParams.get("bodyType"));
  addFilter("fuelType", FILTER_LABELS.fuelType, searchParams.get("fuelType"));
  addFilter(
    "transmission",
    FILTER_LABELS.transmission,
    searchParams.get("transmission")
  );
  addFilter("color", FILTER_LABELS.color, searchParams.get("color"));

  if (searchParams.get("isEconomic") === "true") {
    activeFilters.push({
      key: "isEconomic",
      label: FILTER_LABELS.isEconomic,
      value: "نعم",
    });
  }
  if (searchParams.get("isCommercial") === "true") {
    activeFilters.push({
      key: "isCommercial",
      label: FILTER_LABELS.isCommercial,
      value: "نعم",
    });
  }

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice || maxPrice) {
    const min = minPrice ? parseInt(minPrice) : priceRange?.min;
    const max = maxPrice ? parseInt(maxPrice) : priceRange?.max;
    activeFilters.push({
      key: "price",
      label: "السعر",
      value: `${min?.toLocaleString("ar-SA")} – ${max?.toLocaleString("ar-SA")} ر.س`,
    });
  }

  if (activeFilters.length === 0) return null;

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);

    if (key === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.delete(key);
    }

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clearAll = () => {
    const search = searchParams.get("search");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-gray-500 shrink-0">الفلاتر النشطة:</span>
      {activeFilters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => removeFilter(filter.key)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 hover:border-red-500/50 hover:text-red-400 transition-colors group"
        >
          <span className="text-gray-500">{filter.label}:</span>
          <span className="font-medium text-white group-hover:text-red-400">
            {filter.value}
          </span>
          <X className="h-3 w-3 text-gray-500 group-hover:text-red-400" />
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-yellow-500 transition-colors underline underline-offset-2"
        >
          مسح الكل
        </button>
      )}
    </div>
  );
};

export default ActiveFilterChips;
