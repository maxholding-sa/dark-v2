"use client";
import { useEffect } from "react";

export default function SectionVideoScrollControl({ videoId }) {
    useEffect(() => {
        const video = document.getElementById(videoId);
        if (!video) return;

        const section = video.closest("section");
        if (!section) return;

        let loaded = false;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        video.muted = true;
                        if (!loaded) {
                            video.load();
                            loaded = true;
                        }
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                });
            },
            { rootMargin: "900px", threshold: 0 }
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [videoId]);

    return null;
}
