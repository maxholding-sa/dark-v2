"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CarCard from "./CarCard";

const AUTOPLAY_MS = 4500;
const LOOP_COPIES = 3;

export default function FeaturedCarsCarousel({ cars = [] }) {
  const total = cars.length;
  const loopCars =
    total > 1 ? Array.from({ length: LOOP_COPIES }, () => cars).flat() : cars;

  const [active, setActive] = useState(() => (total > 1 ? total : 0));
  const [paused, setPaused] = useState(false);
  const [enableTransition, setEnableTransition] = useState(true);
  const touchStartX = useRef(null);
  const trackRef = useRef(null);

  const mobileContainerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

  const logicalActive =
    total > 0 ? ((active % total) + total) % total : 0;

  // Keep index in the middle copy: [total, 2*total)
  const normalizeToMiddle = useCallback(
    (index) => {
      if (total <= 1) return 0;
      return total + ((index % total) + total) % total;
    },
    [total]
  );

  useEffect(() => {
    setActive(total > 1 ? total : 0);
    setEnableTransition(true);
  }, [total]);

  useEffect(() => {
    const el = mobileContainerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gap = 12;
  const cardW = containerW > 0 ? (containerW - gap) * 0.42 : 150;
  const trackOffset =
    containerW > 0
      ? (containerW - cardW) / 2 - active * (cardW + gap)
      : 0;

  const next = useCallback(() => {
    if (total === 0) return;
    setEnableTransition(true);
    setActive((cur) => cur + 1);
  }, [total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    setEnableTransition(true);
    setActive((cur) => cur - 1);
  }, [total]);

  const handleTrackTransitionEnd = useCallback(
    (e) => {
      // Ignore bubbled opacity/etc transitions from child cards
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== "transform") return;
      if (total <= 1) return;

      setActive((cur) => {
        if (cur < total || cur >= total * 2) {
          setEnableTransition(false);
          return normalizeToMiddle(cur);
        }
        return cur;
      });
    },
    [total, normalizeToMiddle]
  );

  // After a silent jump, re-enable transitions on the next frame
  useEffect(() => {
    if (enableTransition) return;

    const track = trackRef.current;
    if (track) {
      // Force reflow so the browser applies the jump without animating
      void track.offsetHeight;
    }

    const id = requestAnimationFrame(() => {
      setEnableTransition(true);
    });
    return () => cancelAnimationFrame(id);
  }, [enableTransition, active]);

  // Desktop hides the mobile track (no transitionEnd) — keep index in the middle copy
  useEffect(() => {
    if (total <= 1) return;
    if (active >= total * 2 || active < total) {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        setActive(normalizeToMiddle(active));
      }
    }
  }, [active, total, normalizeToMiddle]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, total, next]);

  if (total === 0) return null;

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

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── MOBILE peek carousel (< md) ───────────────────────────────────── */}
      <div
        ref={mobileContainerRef}
        className="block md:hidden w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          dir="ltr"
          className={`flex ${enableTransition ? "transition-transform duration-500 ease-out" : ""}`}
          style={{
            gap: `${gap}px`,
            transform: `translateX(${trackOffset}px)`,
          }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {loopCars.map((car, i) => (
            <div
              key={`${car.id}-${i}`}
              className="flex-shrink-0 transition-opacity duration-300"
              style={{
                width: `${cardW}px`,
                opacity: i === active ? 1 : 0.55,
              }}
              onClick={() => {
                if (i === active) return;
                setEnableTransition(true);
                setActive(i);
              }}
            >
              <Link
                href={`/cars/${car.id}`}
                onClick={(e) => {
                  if (i !== active) {
                    e.preventDefault();
                    return;
                  }
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
      </div>

      {/* ── DESKTOP 3-D carousel (≥ md) ───────────────────────────────────── */}
      <div className="hidden md:block w-full overflow-hidden h-[460px] md:h-[500px]">
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
            let offset = index - logicalActive;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const abs = Math.abs(offset);
            const isActive = offset === 0;

            if (abs > 4) return null;

            const inView = abs <= 3;
            const translateX = offset * 62;
            const rotateY = -Math.sign(offset) * Math.min(abs * 40, 55);

            return (
              <div
                key={car.id}
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 10 + (total - abs), pointerEvents: "none" }}
              >
                <div
                  className="w-[300px] lg:w-[340px] pointer-events-none transition-all duration-700 ease-out"
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
            href={`/cars/${cars[logicalActive].id}`}
            onClick={() => window.dispatchEvent(new CustomEvent("startLoading"))}
            aria-label="عرض تفاصيل السيارة"
            className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[300px] lg:w-[340px] h-[360px] lg:h-[390px] cursor-pointer rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
