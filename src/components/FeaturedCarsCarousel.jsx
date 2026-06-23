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

  // Measure the mobile container so we can compute exact pixel offsets
  const mobileContainerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    const el = mobileContainerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Each card takes exactly half the container minus half the gap, so the
  // visible area shows: ½ prev card | full active card | ½ next card
  const gap = 12;
  const cardW = containerW > 0 ? (containerW - gap) / 2 : 165;
  // Offset that keeps the active card perfectly centered
  const trackOffset =
    containerW > 0
      ? (containerW - cardW) / 2 - active * (cardW + gap)
      : 0;

  // Desktop: wraps around infinitely
  const goTo = useCallback(
    (index) => {
      if (total === 0) return;
      setActive(((index % total) + total) % total);
    },
    [total]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Mobile: clamps to [0, total-1] — has a clear start and end
  const mobileNext = useCallback(
    () => setActive((cur) => Math.min(cur + 1, total - 1)),
    [total]
  );
  const mobilePrev = useCallback(
    () => setActive((cur) => Math.max(cur - 1, 0)),
    []
  );

  // Autoplay stops at the last card instead of wrapping
  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(() => {
      setActive((cur) => {
        if (cur >= total - 1) return cur;
        return cur + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, total]);

  if (total === 0) return null;

  // Desktop touch handlers (wrapping)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  // Mobile touch handlers (clamped)
  const handleMobileTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleMobileTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) mobileNext();
      else mobilePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── MOBILE peek carousel (< md) ─────────────────────────────────────
          Layout: ½ previous card | active card | ½ next card
          Each card = (containerWidth - gap) / 2, centered by trackOffset.   */}
      <div
        ref={mobileContainerRef}
        className="block md:hidden w-full overflow-hidden"
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
      >
        <div
          dir="ltr"
          className="flex transition-transform duration-500 ease-out"
          style={{
            gap: `${gap}px`,
            transform: `translateX(${trackOffset}px)`,
          }}
        >
          {cars.map((car, i) => (
            <div
              key={car.id}
              className="flex-shrink-0 transition-opacity duration-300"
              style={{
                width: `${cardW}px`,
                opacity: i === active ? 1 : 0.55,
              }}
              onClick={() => i !== active && goTo(i)}
            >
              <Link
                href={`/cars/${car.id}`}
                onClick={(e) => {
                  if (i !== active) { e.preventDefault(); return; }
                  window.dispatchEvent(new CustomEvent("startLoading"));
                }}
              >
                <div dir="rtl">
                  <CarCard car={car} isFeatured={true} />
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {cars.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-yellow-500" : "w-2 bg-white/30"
              }`}
              aria-label={`انتقل إلى السيارة ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── DESKTOP 3-D carousel (≥ md) ─────────────────────────────────────
          overflow-hidden and perspective are on SEPARATE elements on purpose.
          Putting both on the same div causes iOS/Safari to hide all children. */}
      <div className="hidden md:block w-full overflow-hidden h-[480px] md:h-[500px]">
        <div
          dir="ltr"
          className="relative w-full h-full"
          style={{ perspective: "1500px", perspectiveOrigin: "center center" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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

            if (abs > 4) return null;

            const inView = abs <= 3;
            const translateX = offset * 78;
            const rotateY = -Math.sign(offset) * Math.min(abs * 40, 55);

            return (
              <div
                key={car.id}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 10 + (total - abs), pointerEvents: "none" }}
              >
                <div
                  className="w-[390px] lg:w-[440px] pointer-events-none transition-all duration-700 ease-out"
                  style={{
                    transform: `translateX(${translateX}%) rotateY(${rotateY}deg)`,
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

          <Link
            href={`/cars/${cars[active].id}`}
            onClick={() => window.dispatchEvent(new CustomEvent("startLoading"))}
            aria-label="عرض تفاصيل السيارة"
            className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[390px] lg:w-[440px] h-[360px] lg:h-[400px] cursor-pointer rounded-xl"
          />
        </div>
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
            onClick={mobilePrev}
            aria-label="السابق"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 text-white transition-all duration-300 hover:border-yellow-500 hover:bg-yellow-500 hover:text-black"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={mobileNext}
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
