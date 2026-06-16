import SectionVideoScrollControl from "./SectionVideoScrollControl";

export default function SectionBackgroundVideo({
    src,
    mobileSrc,
    poster,
    className = "",
    playOnScroll = true,
}) {
    const videoId = `section-video-${src.replace(/[^a-z0-9]/gi, "")}`;

    return (
        <>
            <video
                id={videoId}
                className={className}
                poster={poster}
                muted
                loop
                playsInline
                preload={playOnScroll ? "none" : "metadata"}
                style={{ pointerEvents: "none" }}
            >
                {mobileSrc && (
                    <source src={mobileSrc} media="(max-width: 768px)" type="video/mp4" />
                )}
                <source src={src} type="video/mp4" />
            </video>
            {playOnScroll && <SectionVideoScrollControl videoId={videoId} />}
        </>
    );
}
