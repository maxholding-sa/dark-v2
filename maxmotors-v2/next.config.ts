import type { NextConfig } from "next";

/**
 * Hosts allowed to serve <Image> sources. Supabase project refs come from the
 * environment instead of a hardcoded list, so promoting a new project does not
 * require a code change.
 */
const supabaseImageHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  ...(supabaseImageHost
    ? ([
        {
          protocol: "https" as const,
          hostname: supabaseImageHost,
          pathname: "/storage/v1/object/public/**",
        },
      ] as const)
    : []),
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "img.youtube.com" },
  { protocol: "https", hostname: "placehold.co" },
];

/**
 * Sent on every response. `Content-Security-Policy` is deliberately omitted
 * here — Clerk and Supabase need per-route nonces, so it belongs in middleware.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // No `ignoreBuildErrors`. A type error must fail the build.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  images: { remotePatterns },

  // Route strings are checked against the actual route tree, so a typo in a
  // `<Link href>` fails the build instead of 404-ing in production.
  typedRoutes: true,

  // This app lives in a subdirectory of the v1 repository, and Next would
  // otherwise infer the parent as the workspace root from its lockfile.
  outputFileTracingRoot: import.meta.dirname,

  experimental: {
    // Uploads go straight to Supabase Storage from the browser, so server
    // actions only ever carry metadata. 2 MB is generous for that.
    serverActions: { bodySizeLimit: "2mb" },
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/:path*.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
