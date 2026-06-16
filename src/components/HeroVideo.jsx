/**
 * Server-rendered hero video — starts loading in the initial HTML
 * without waiting for React client hydration.
 */
export default function HeroVideo({
  src = "/hero1.mp4",
  mobileSrc = "/hero1-mobile.mp4",
  poster,
  className = "",
}) {
  const isLocal = src.startsWith("/");
  const posterUrl = poster || (isLocal ? "/hero1-poster.jpg" : undefined);

  return (
    <video
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={posterUrl}
      fetchPriority="high"
      style={{ pointerEvents: "none" }}
    >
      {isLocal && mobileSrc && (
        <source src={mobileSrc} media="(max-width: 768px)" type="video/mp4" />
      )}
      <source src={src} type="video/mp4" />
    </video>
  );
}
