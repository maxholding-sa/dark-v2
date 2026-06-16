"use client";
import React, { useEffect, useRef, useState } from "react";

const VideoPlayer = ({
    src,
    mobileSrc,
    poster,
    autoPlay = true,
    muted = true,
    loop = true,
    className = "",
    playOnScroll = false,
    priority = false,
}) => {
    const videoRef = useRef(null);
    const [isNearViewport, setIsNearViewport] = useState(priority || !playOnScroll);

    // Lazy-load below-fold videos when section nears viewport
    useEffect(() => {
        if (!playOnScroll) return;

        const video = videoRef.current;
        const section = video?.closest("section");
        if (!section) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = videoRef.current;
                    if (!el) return;

                    if (entry.isIntersecting) {
                        setIsNearViewport(true);
                        el.muted = true;
                        el.load();
                        el.play().catch(() => {});
                    } else {
                        el.pause();
                    }
                });
            },
            { rootMargin: "900px", threshold: 0 }
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [playOnScroll]);

    // Hero / priority autoplay on mount
    useEffect(() => {
        const video = videoRef.current;
        if (!video || playOnScroll || !autoPlay) return;

        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute("muted", "");

        const attemptPlay = () => {
            video.play().catch(() => {
                setTimeout(() => {
                    if (video?.paused) {
                        video.muted = true;
                        video.play().catch(() => {});
                    }
                }, 300);
            });
        };

        if (video.readyState >= 2) {
            attemptPlay();
        } else {
            video.addEventListener("loadeddata", attemptPlay, { once: true });
        }

        return () => video.removeEventListener("loadeddata", attemptPlay);
    }, [autoPlay, playOnScroll]);

    const preload = priority
        ? "auto"
        : playOnScroll
          ? isNearViewport
              ? "auto"
              : "none"
          : "metadata";

    return (
        <video
            ref={videoRef}
            className={className}
            poster={poster}
            autoPlay={autoPlay && !playOnScroll}
            muted={muted}
            loop={loop}
            playsInline
            preload={preload}
            {...(priority ? { fetchPriority: "high" } : {})}
            style={{ pointerEvents: "none" }}
        >
            {mobileSrc && (
                <source src={mobileSrc} media="(max-width: 768px)" type="video/mp4" />
            )}
            <source src={src} type="video/mp4" />
        </video>
    );
};

export default VideoPlayer;
