"use client";
import { useRef, useEffect, useState } from "react";

/**
 * Hero video that starts invisible and fades in only once the first
 * frame is ready to display. The parent <section> shows the poster
 * image as a background-image (set in page.jsx) until then.
 */
export default function HeroVideo({
  src = "/hero1.mp4",
  mobileSrc = "/hero1-mobile.mp4",
  className = "",
}) {
  const isLocal = src.startsWith("/");
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // readyState >= 2 means the current frame is available to display
    if (video.readyState >= 2) {
      setReady(true);
      return;
    }

    const onReady = () => setReady(true);
    video.addEventListener("loadeddata", onReady);
    return () => video.removeEventListener("loadeddata", onReady);
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      fetchPriority="high"
      style={{
        pointerEvents: "none",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      {isLocal && mobileSrc && (
        <source src={mobileSrc} media="(max-width: 768px)" type="video/mp4" />
      )}
      <source src={src} type="video/mp4" />
    </video>
  );
}
