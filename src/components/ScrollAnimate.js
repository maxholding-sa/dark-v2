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

    // Pre-style children for stagger so they start hidden
    if (stagger) {
      const kids = Array.from(el.children);
      kids.forEach((child) => {
        child.style.opacity = "0";
        child.style.transform = "translateY(24px)";
        child.style.transition =
          "opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)";
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");

            if (stagger) {
              const kids = Array.from(entry.target.children);
              kids.forEach((child, i) => {
                child.style.transitionDelay = `${i * 80}ms`;
                child.style.opacity = "1";
                child.style.transform = "translateY(0)";
              });
            }

            // Unobserve after first trigger so it doesn't re-reset
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

    return () => {
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
