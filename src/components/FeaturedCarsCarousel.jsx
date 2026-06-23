"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import CarCard from "./CarCard";

const AUTOPLAY_MS = 4500;

export default function FeaturedCarsCarousel({ cars = [] }) {
  const total = cars.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const goTo = useCallback(
    (index) => {
      if (total === 0) return;
      setActive(((index % total) + total) % total);
    },
    [total]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(() => {
      setActive((cur) => (cur + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, total]);

  if (total === 0) return null;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      // RTL-friendly: swipe left -> next, swipe right -> prev
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stage */}
      <div
        dir="ltr"
        className="relative h-[400px] sm:h-[440px] md:h-[500px] w-full overflow-hidden"
        style={{ perspective: "1500px", perspectiveOrigin: "center center" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev / next click zones sit underneath the cards (z-0) so the
            active card always stays clickable above them. */}
        <div className="absolute inset-0 z-0 flex">
          <div onClick={prev} className="flex-1 cursor-pointer" aria-label="السابق" />
          <div onClick={next} className="flex-1 cursor-pointer" aria-label="التالي" />
        </div>
        {cars.map((car, index) => {
          let offset = index - active;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;

          const abs = Math.abs(offset);
          const isActive = offset === 0;

          // Render the visible window plus one buffer card on each side so
          // cards slide in/out smoothly (the buffer is clipped by the stage)
          // instead of popping in. Anything further out is unmounted.
          if (abs > 4) return null;

          const inView = abs <= 3;
          // Equal horizontal step + no z-recede keeps the gaps between every
          // card identical (perspective z-depth would compress far gaps).
          const translateX = offset * 78;
          // Cap the tilt so cards never reach 90deg (which makes them
          // edge-on / invisible). Side cards stay facing the viewer.
          const rotateY = -Math.sign(offset) * Math.min(abs * 40, 55);

          return (
            // Full-stage layer flex-centers the card; the transform then
            // offsets it. This guarantees the active card is dead-center.
            <div
              key={car.id}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 10 + (total - abs), pointerEvents: "none" }}
            >
              <div
                className="w-[290px] sm:w-[340px] md:w-[390px] lg:w-[440px] pointer-events-none transition-all duration-700 ease-out"
                style={{
                  transform: `translateX(${translateX}%) rotateY(${rotateY}deg)`,
                  transformStyle: "preserve-3d",
                  opacity: inView ? (isActive ? 1 : 0.78) : 0,
                  filter: isActive ? "none" : `brightness(${Math.max(0.4, 0.78 - abs * 0.12)})`,
                }}
              >
                <div dir="rtl" className={isActive ? "shadow-2xl shadow-black/60 rounded-xl" : ""}>
                  <CarCard car={car} isFeatured={true} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Transparent link sitting on top of the center card. This is the
            only element above the prev/next zones at the center, so clicking
            the middle card always navigates to its details page. */}
        <Link
          href={`/cars/${cars[active].id}`}
          onClick={() => window.dispatchEvent(new CustomEvent("startLoading"))}
          aria-label="عرض تفاصيل السيارة"
          className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[290px] sm:w-[340px] md:w-[390px] lg:w-[440px] h-[260px] sm:h-[300px] md:h-[360px] lg:h-[400px] cursor-pointer rounded-xl"
        />
      </div>

      {/* Navigation */}
      <div className="mt-4 flex flex-col items-center gap-4">
        <Link
          href={`/cars/${cars[active].id}`}
          onClick={() => window.dispatchEvent(new CustomEvent("startLoading"))}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base shadow-lg shadow-yellow-500/20 transition-all duration-300 hover:scale-105"
        >
          <Eye className="h-5 w-5" />
          عرض التفاصيل
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="السابق"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 text-white transition-all duration-300 hover:border-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="التالي"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 text-white transition-all duration-300 hover:border-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
