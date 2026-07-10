"use client";
import { useEffect, useRef, useState } from "react";

function pickVideoSrc(src, mobileSrc) {
    if (typeof window === "undefined") return src;
    return window.matchMedia("(max-width: 768px)").matches && mobileSrc
        ? mobileSrc
        : src;
}

export default function SectionBackgroundVideo({
    src,
    mobileSrc,
    poster,
    className = "",
    playOnScroll = true,
}) {
    const videoRef = useRef(null);
    const [videoSrc, setVideoSrc] = useState(src);

    useEffect(() => {
        setVideoSrc(pickVideoSrc(src, mobileSrc));

        const mq = window.matchMedia("(max-width: 768px)");
        const onChange = () => setVideoSrc(pickVideoSrc(src, mobileSrc));
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, [src, mobileSrc]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !playOnScroll) return;

        const section = video.closest("section, [data-section-video-root]");
        if (!section) return;

        let loaded = false;

        const loadAndPlay = () => {
            video.muted = true;
            if (!loaded) {
                video.load();
                loaded = true;
            }
            video.play().catch(() => {});
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        loadAndPlay();
                    } else {
                        video.pause();
                    }
                });
            },
            { rootMargin: "900px", threshold: 0 }
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [playOnScroll, videoSrc]);

    return (
        <video
            ref={videoRef}
            key={videoSrc}
            className={className}
            src={videoSrc}
            poster={poster}
            muted
            loop
            playsInline
            preload={playOnScroll ? "none" : "metadata"}
            style={{ pointerEvents: "none" }}
        />
    );
}
