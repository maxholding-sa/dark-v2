"use client";
import React, { useEffect, useRef } from "react";

/**
 * ScrollAnimate — triggers a fade/slide-in when the element enters the viewport.
 *
 * Props:
 *  className  — extra classes forwarded to the wrapper div
 *  stagger    — when true, direct children are animated in sequence (80 ms apart)
 *  delay      — extra delay (ms) added to the wrapper's own transition
 *  variant    — "up" (default) | "left" | "right" | "scale"
 *               controls the initial transform direction
 */
const VARIANT_INIT = {
  up:    { transform: "translateY(28px)" },
  down:  { transform: "translateY(-28px)" },
  left:  { transform: "translateX(40px)" },
  right: { transform: "translateX(-40px)" },
  scale: { transform: "scale(0.92)" },
};

const ScrollAnimate = ({
  children,
  className = "",
  stagger = false,
  delay = 0,
  variant = "up",
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Apply initial delay on the wrapper itself
    if (delay) {
      el.style.transitionDelay = `${delay}ms`;
    }

    // Pre-style children for stagger (transform only — keep text visible)
    if (stagger) {
      const kids = Array.from(el.children);
      kids.forEach((child) => {
        child.style.transform = "translateY(24px)";
        child.style.transition =
          "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)";
      });
    }

    const reveal = (target) => {
      target.classList.add("animate-in");
      target.style.transform = "";

      if (stagger) {
        const kids = Array.from(target.children);
        kids.forEach((child, i) => {
          child.style.transitionDelay = `${i * 80}ms`;
          child.style.transform = "translateY(0)";
        });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px 60px 0px",
      }
    );

    observer.observe(el);

    // Reveal immediately if already in the viewport (avoids stuck opacity:0)
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0;

    if (inView) {
      reveal(el);
      observer.unobserve(el);
    }

    // Safety net: never leave content hidden if the observer never fires
    const fallbackTimer = window.setTimeout(() => {
      if (!el.classList.contains("animate-in")) {
        reveal(el);
      }
      observer.unobserve(el);
    }, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.unobserve(el);
    };
  }, [stagger, delay, variant]);

  // Build the initial inline style based on variant
  const initStyle = VARIANT_INIT[variant] || VARIANT_INIT.up;

  return (
    <div
      ref={ref}
      className={`scroll-animate ${className}`}
      style={initStyle}
    >
      {children}
    </div>
  );
};

export default ScrollAnimate;
