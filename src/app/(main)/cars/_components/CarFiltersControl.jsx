"use client";

import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Check, Search, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatFilterPriceReact } from "@/lib/helper";
import { cn } from "@/lib/utils";

const FilterChip = ({ label, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
      isSelected
        ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/50 hover:bg-yellow-600/30"
        : "bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white"
    )}
  >
    {label}
    {isSelected && <Check className="h-3 w-3 shrink-0" />}
  </button>
);

const CarFiltersControl = ({
  filters,
  currentFilters,
  onFilterChange,
  onClearFilter,
  loading = false,
}) => {
  const { make, bodyType, fuelType, transmission, priceRange, priceRangeMin, priceRangeMax } = currentFilters;
  const [makeSearch, setMakeSearch] = useState("");

  const priceMin = priceRangeMin ?? filters.data.priceRange.min;
  const priceMax = priceRangeMax ?? filters.data.priceRange.max;
  const isPriceFiltered =
    priceRange[0] > priceMin || priceRange[1] < priceMax;

  const filterSections = [
    {
      id: "make",
      title: "الماركة",
      options: filters?.data.makes.map((m) => ({ value: m, label: m })),
      currentValue: make,
      onChange: (value) => onFilterChange("make", value),
      searchable: true,
    },
    {
      id: "bodyType",
      title: "نوع الهيكل",
      options: filters?.data.bodyTypes.map((b) => ({ value: b, label: b })),
      currentValue: bodyType,
      onChange: (value) => onFilterChange("bodyType", value),
    },
    {
      id: "fuelType",
      title: "نوع الوقود",
      options: filters?.data.fuelTypes.map((f) => ({ value: f, label: f })),
      currentValue: fuelType,
      onChange: (value) => onFilterChange("fuelType", value),
    },
    {
      id: "transmission",
      title: "ناقل الحركة",
      options: filters?.data.transmissions.map((t) => ({
        value: t,
        label: t,
      })),
      currentValue: transmission,
      onChange: (value) => onFilterChange("transmission", value),
    },
  ].filter((section) => section.options && section.options.length > 0);

  const defaultOpenSections = [
    "price",
    ...filterSections
      .filter((s) => s.currentValue)
      .map((s) => s.id),
  ];

  return (
    <div className="space-y-1">
      {/* Price Range */}
      <Accordion
        type="multiple"
        defaultValue={defaultOpenSections}
        className="w-full"
      >
        <AccordionItem value="price" className="border-gray-800 px-4">
          <AccordionTrigger className="text-white hover:no-underline py-4">
            <span className="flex items-center gap-2">
              نطاق السعر
              {isPriceFiltered && (
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-500 mb-0.5">الحد الأدنى</p>
                  <p className="text-sm font-medium text-white">
                    {formatFilterPriceReact(priceRange[0])}
                  </p>
                </div>
                <span className="text-gray-600 text-sm">—</span>
                <div className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-500 mb-0.5">الحد الأعلى</p>
                  <p className="text-sm font-medium text-white">
                    {formatFilterPriceReact(priceRange[1])}
                  </p>
                </div>
              </div>
              <Slider
                min={priceMin}
                max={priceMax}
                step={100}
                value={priceRange}
                onValueChange={(value) => onFilterChange("priceRange", value)}
                className="[&_[data-slot=slider-range]]:bg-yellow-600 [&_[data-slot=slider-thumb]]:border-yellow-600 [&_[data-slot=slider-thumb]]:bg-yellow-500"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {filterSections.map((section) => {
          const filteredOptions = section.searchable
            ? section.options.filter((opt) =>
                opt.label
                  .toLowerCase()
                  .includes(makeSearch.toLowerCase().trim())
              )
            : section.options;

          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border-gray-800 px-4"
            >
              <AccordionTrigger className="text-white hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  {section.title}
                  {section.currentValue && (
                    <span className="inline-flex items-center rounded-full bg-yellow-600/20 text-yellow-400 text-[10px] px-2 py-0.5 font-normal">
                      {section.currentValue}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-2">
                  {section.searchable && (
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                      <Input
                        placeholder="ابحث عن ماركة..."
                        value={makeSearch}
                        onChange={(e) => setMakeSearch(e.target.value)}
                        className="pr-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm h-8"
                      />
                    </div>
                  )}

                  {section.currentValue && (
                    <button
                      type="button"
                      onClick={() => onClearFilter(section.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                      مسح {section.title}
                    </button>
                  )}

                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {loading && section.id !== "make" ? (
                      <p className="text-xs text-gray-500 py-2">جاري التحميل...</p>
                    ) : filteredOptions.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">
                        لا توجد نتائج
                      </p>
                    ) : (
                      filteredOptions.map((option) => (
                        <FilterChip
                          key={`${section.id}-${option.value}`}
                          label={option.label}
                          isSelected={section.currentValue === option.value}
                          onClick={() =>
                            section.onChange(
                              section.currentValue === option.value
                                ? ""
                                : option.value
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CarFiltersControl;
