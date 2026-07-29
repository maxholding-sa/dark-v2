/** @type {import('next').NextConfig} */

// Prevent glob from scanning protected directories
process.env.GLOBBY_IGNORE = 'C:\\Users\\**,C:\\Windows\\**,C:\\ProgramData\\**';
process.env.GLOBBY_OPTIONS = JSON.stringify({
  ignore: ['C:\\Users\\**', 'C:\\Windows\\**', 'C:\\ProgramData\\**', '**/Cookies/**'],
  followSymlinkedDirectories: false,
});

const resolveSiteUrl = (raw = process.env.NEXT_PUBLIC_SITE_URL) => {
  const url = String(raw || "https://maxmotors.sa").trim().replace(/\/$/, "");
  if (!url || /crown-?auto/i.test(url)) return "https://maxmotors.sa";
  return url;
};
const siteUrl = resolveSiteUrl();

const parseHostname = (value) => {
  if (!value) return null;
  try {
    const withProtocol = value.startsWith("http") ? value : `https://${value}`;
    return new URL(withProtocol).host;
  } catch {
    return null;
  }
};

const serverActionAllowedOrigins = [
  parseHostname(siteUrl),
  parseHostname(process.env.VERCEL_URL),
  ...(process.env.NODE_ENV !== "production" ? ["localhost:3000"] : []),
  ...(process.env.SERVER_ACTION_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => parseHostname(origin.trim()))
    .filter(Boolean),
].filter(Boolean);

const uniqueServerActionAllowedOrigins = [...new Set(serverActionAllowedOrigins)];

const baselineSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig = {
  // Required by Next.js 16 if you want to use Webpack
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zafndavpzgpcbqgvosbt.supabase.co",
        pathname: "/storage/v1/object/public/**", // allow Supabase storage path
      },
      {
        protocol: "https",
        hostname: "mejemytwlemjflpcftct.supabase.co",
        pathname: "/storage/v1/object/public/**", // allow Supabase storage path
      },
      {
        protocol: "https",
        hostname: "yffvqnbnbuqcfqmuxmqo.supabase.co",
        pathname: "/storage/v1/object/public/**", // allow Supabase storage path
      },
      {
        protocol: "https",
        hostname: "jbpsuxpvazcchafiqnrf.supabase.co",
        pathname: "/storage/v1/object/public/**", // allow Supabase storage path
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },

  // Custom webpack config (keeps your project working)
  webpack(config, { isServer, dev }) {
    // Prevent webpack/glob from scanning system directories
    config.watchOptions = {
      ignored: ["**/node_modules", "**/.next", "**/.git"],
      poll: 1000, // Check for changes every second (more stable on Windows)
      aggregateTimeout: 300,
    };

    // Disable glob pattern scanning that causes permission issues
    if (config.module && config.module.rules) {
      config.module.rules = config.module.rules.map(rule => {
        if (rule.exclude) {
          if (typeof rule.exclude === 'function') {
            const originalExclude = rule.exclude;
            rule.exclude = (path) => {
              if (path.includes('Cookies') || path.includes('AppData')) {
                return true;
              }
              return originalExclude(path);
            };
          } else if (rule.exclude instanceof RegExp) {
            rule.exclude = new RegExp(rule.exclude.source + '|Cookies|AppData');
          }
        }
        return rule;
      });
    }

    return config;
  },

  experimental: {
    // Disabled in dev: parallel webpack workers can race and omit vendor-chunks (@clerk.js, etc.)
    webpackBuildWorker: process.env.NODE_ENV === "production",
    serverActions: {
      bodySizeLimit: "1gb",
      allowedOrigins: uniqueServerActionAllowedOrigins,
    },
    // Next.js 15.5+ internal proxy for server actions (defaults to 1MB)
    proxyClientMaxBodySize: "1gb",
  },

  serverActions: {
    bodySizeLimit: "1gb",
    allowedOrigins: uniqueServerActionAllowedOrigins,
  },

  // Increase payload size limits (Pages Router API routes)
  api: {
    bodyParser: {
      sizeLimit: "1gb",
    },
    responseLimit: "1gb",
  },

  // Middleware body buffering limit
  middlewareClientMaxBodySize: "1gb",

  httpMaxRequestSize: "1gb",

  // Allow streaming uploads
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: baselineSecurityHeaders,
      },
      {
        source: "/:path*.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*-poster.jpg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
