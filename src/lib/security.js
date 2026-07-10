const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://maxmotors.sa").replace(/\/$/, "");

const parseOrigin = (value) => {
  if (!value) return null;
  try {
    const withProtocol = value.startsWith("http") ? value : `https://${value}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

const parseAllowedOrigins = () => {
  const configured = (process.env.ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => parseOrigin(origin.trim()))
    .filter(Boolean);

  const defaults = [
    parseOrigin(SITE_URL),
    parseOrigin(process.env.VERCEL_URL),
    process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
  ].filter(Boolean);

  return [...new Set([...configured, ...defaults])];
};

export const allowedOrigins = parseAllowedOrigins();

const clerkScriptSources = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.dev",
  "https://*.clerk.com",
];

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : null,
  ...clerkScriptSources,
  "https://challenges.cloudflare.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://sc-static.net",
  "https://www.clarity.ms",
  "https://static.klaviyo.com",
].filter(Boolean);

const connectSources = [
  "'self'",
  ...clerkScriptSources,
  "https://*.supabase.co",
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://www.facebook.com",
  "https://analytics.tiktok.com",
  "https://*.clarity.ms",
];

const frameSources = [
  "'self'",
  ...clerkScriptSources,
  "https://challenges.cloudflare.com",
  "https://www.youtube.com",
  "https://www.google.com",
  "https://maps.google.com",
];

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      `script-src ${scriptSources.join(" ")}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://img.youtube.com https://img.clerk.com https://placehold.co https://www.facebook.com",
      "media-src 'self' blob: https://*.supabase.co",
      `connect-src ${connectSources.join(" ")}`,
      `frame-src ${frameSources.join(" ")}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

export const getCorsHeaders = (origin) => {
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : null;

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
};

export const applySecurityHeaders = (response) => {
  for (const { key, value } of securityHeaders) {
    response.headers.set(key, value);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
};

export const applyCorsHeaders = (response, origin) => {
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
};
