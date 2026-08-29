/**
 * SEO Configuration and utilities for ماكس موتورز - MaxMotors
 * Market: Saudi Arabia
 */

const CANONICAL_SITE_URL = "https://maxmotors.sa";

/** Resolve public site URL; never emit the legacy crown-auto domain in share metadata. */
export const resolveSiteUrl = (raw = process.env.NEXT_PUBLIC_SITE_URL) => {
  const url = String(raw || CANONICAL_SITE_URL).trim().replace(/\/$/, "");
  if (!url || /crown-?auto/i.test(url)) return CANONICAL_SITE_URL;
  return url;
};

export const SITE_CONFIG = {
  name: "ماكس موتورز",
  englishName: "maxmotors",
  description: "ماكس موتورز - منصة سعودية لشراء السيارات الجديدة والمستعملة، حجز تجربة القيادة، ومقارنة العروض التمويلية بثقة وسهولة.",
  url: resolveSiteUrl(),
  locale: "ar-SA",
  lang: "ar",
  defaultOgImage: "/og-image.jpg",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterHandle: "@maxmotors_sa",
};

/**
 * Real business details for structured data. Google discounts (and Rich Results
 * flags) schema containing placeholder values, so every field here is opt-in:
 * anything left unset is stripped by `compact` rather than emitted as a stub.
 */
export const BUSINESS_INFO = {
  telephone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
  streetAddress: process.env.NEXT_PUBLIC_BUSINESS_STREET || "",
  addressLocality: process.env.NEXT_PUBLIC_BUSINESS_CITY || "",
  addressRegion: process.env.NEXT_PUBLIC_BUSINESS_REGION || "",
  postalCode: process.env.NEXT_PUBLIC_BUSINESS_POSTAL || "",
  addressCountry: "SA",
};

const hasBusinessAddress = () =>
  Boolean(BUSINESS_INFO.streetAddress || BUSINESS_INFO.addressLocality);

const businessAddress = () =>
  hasBusinessAddress()
    ? {
        "@type": "PostalAddress",
        streetAddress: BUSINESS_INFO.streetAddress,
        addressLocality: BUSINESS_INFO.addressLocality,
        addressRegion: BUSINESS_INFO.addressRegion,
        postalCode: BUSINESS_INFO.postalCode,
        addressCountry: BUSINESS_INFO.addressCountry,
      }
    : undefined;

/**
 * Public profiles that prove the brand identity to search engines. Only list
 * accounts that actually exist — a `sameAs` pointing at a 404 is a negative signal.
 */
export const SOCIAL_PROFILES = (process.env.NEXT_PUBLIC_SOCIAL_PROFILES || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

export const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

/**
 * For faceted listing URLs (filter combinations, sort orders, search queries).
 * They are not worth indexing on their own — near-duplicates of /cars — but the
 * car links on them are the crawl path into the detail pages, so keep `follow`.
 */
export const NOINDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    "max-image-preview": "large",
  },
};

export const SAUDI_MARKET_KEYWORDS = {
  primary: [
    "ماكس موتورز",
    "شراء سيارات السعودية",
    "سيارات السعودية",
    "بيع سيارات السعودية",
    "سيارات جديدة السعودية",
    "سيارات مستعملة السعودية",
  ],
  secondary: [
    "أسعار السيارات في السعودية",
    "معارض سيارات السعودية",
    "تمويل السيارات السعودية",
    "رخص قيادة السعودية",
    "تأمين السيارات السعودية",
    "صيانة السيارات السعودية",
  ],
  brands: [
    "تويوتا",
    "هيونداي",
    "نيسان",
    "كيا",
    "سكودا",
    "بي ام دبليو",
    "مرسيدس",
    "فورد",
    "جنرال موتورز",
  ],
  locations: [
    "الرياض",
    "جدة",
    "الدمام",
    "الخبر",
    "الظهران",
    "تبوك",
    "جازان",
    "عسير",
    "حائل",
    "القصيم",
  ],
};

export const absoluteUrl = (path = "/") => {
  if (!path) return SITE_CONFIG.url;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_CONFIG.url}${path.startsWith("/") ? path : `/${path}`}`;
};

const compact = (value) => {
  if (Array.isArray(value)) {
    return value.map(compact).filter((item) => item !== undefined && item !== null);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, compact(item)])
        .filter(([, item]) => item !== undefined && item !== null && item !== "")
    );
  }

  return value;
};

export const truncate = (text = "", maxLength = 160) => {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
};

export const generateMetadata = ({
  title,
  description,
  keywords = [],
  ogImage = SITE_CONFIG.defaultOgImage,
  // Overridable because not every share image is a 1200x630 banner: pass null for
  // both dimensions when the image is a logo, so scrapers measure it themselves.
  ogImageWidth = SITE_CONFIG.ogImageWidth,
  ogImageHeight = SITE_CONFIG.ogImageHeight,
  twitterCard = "summary_large_image",
  ogType = "website",
  canonicalUrl = SITE_CONFIG.url,
  author = SITE_CONFIG.name,
  robots = INDEX_ROBOTS,
  ogLocale = SITE_CONFIG.locale,
  other = {},
} = {}) => {
  const canonical = absoluteUrl(canonicalUrl);
  const allKeywords = [
    ...SAUDI_MARKET_KEYWORDS.primary,
    ...keywords,
  ].join(", ");

  return compact({
    title: title || SITE_CONFIG.name,
    description: description || SITE_CONFIG.description,
    keywords: allKeywords,
    authors: [{ name: author }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    formatDetection: {
      email: false,
      telephone: false,
      address: false,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black",
      title: SITE_CONFIG.name,
    },
    applicationName: SITE_CONFIG.name,
    robots,
    metadataBase: new URL(SITE_CONFIG.url),
    alternates: {
      canonical,
      languages: {
        "ar-SA": canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      type: ogType,
      url: canonical,
      title: title || SITE_CONFIG.name,
      description: description || SITE_CONFIG.description,
      siteName: SITE_CONFIG.name,
      locale: ogLocale,
      images: [
        {
          url: absoluteUrl(ogImage),
          width: ogImageWidth,
          height: ogImageHeight,
          alt: title || SITE_CONFIG.name,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      site: SITE_CONFIG.twitterHandle,
      creator: SITE_CONFIG.twitterHandle,
      title: title || SITE_CONFIG.name,
      description: description || SITE_CONFIG.description,
      images: [absoluteUrl(ogImage)],
    },
    verification: {
      google: "JGLgXvJvi4W4A8NgMdI99dGfG3XbDHc9ZBEJsqjF8bY",
    },
    other,
  });
};

/**
 * Generate structured data (JSON-LD)
 */
export const generateJsonLd = (type, data = {}) => {
  const baseStructure = {
    "@context": "https://schema.org",
  };

  const schemas = {
    organization: {
      ...baseStructure,
      "@type": "Organization",
      "@id": `${SITE_CONFIG.url}/#organization`,
      name: SITE_CONFIG.name,
      // Both spellings Google may see the brand under, so it can tie the
      // Arabic and Latin queries to this one entity.
      alternateName: ["MaxMotors", "Max Motors", "ماكس موتورز للسيارات"],
      url: SITE_CONFIG.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/logo.jpg`,
        width: 854,
        height: 678,
      },
      description: SITE_CONFIG.description,
      sameAs: SOCIAL_PROFILES.length ? SOCIAL_PROFILES : undefined,
      contactPoint: BUSINESS_INFO.telephone
        ? {
            "@type": "ContactPoint",
            contactType: "Customer Service",
            telephone: BUSINESS_INFO.telephone,
            areaServed: "SA",
            availableLanguage: ["ar", "en"],
          }
        : undefined,
      address: businessAddress(),
    },
    localBusiness: {
      ...baseStructure,
      "@type": "AutoDealer",
      "@id": `${SITE_CONFIG.url}/#dealer`,
      name: SITE_CONFIG.name,
      image: `${SITE_CONFIG.url}/logo.jpg`,
      description: SITE_CONFIG.description,
      url: SITE_CONFIG.url,
      parentOrganization: { "@id": `${SITE_CONFIG.url}/#organization` },
      telephone: BUSINESS_INFO.telephone || undefined,
      address: businessAddress(),
      areaServed: SAUDI_MARKET_KEYWORDS.locations,
      priceRange: "$$",
      sameAs: SOCIAL_PROFILES.length ? SOCIAL_PROFILES : undefined,
    },
    product: {
      ...baseStructure,
      "@type": "Car",
      name: data.name || "سيارة",
      description: data.description,
      image: data.image,
      vehicleModelDate: data.year,
      brand: {
        "@type": "Brand",
        name: data.brand || "Unknown",
      },
      offers: {
        "@type": "Offer",
        url: data.url,
        priceCurrency: "SAR",
        price: data.price,
        availability: data.availability || "https://schema.org/InStock",
      },
      aggregateRating: data.rating ? {
        "@type": "AggregateRating",
        ratingValue: data.rating.value,
        ratingCount: data.rating.count,
      } : undefined,
    },
    searchAction: {
      ...baseStructure,
      "@type": "WebSite",
      "@id": `${SITE_CONFIG.url}/#website`,
      name: SITE_CONFIG.name,
      alternateName: ["MaxMotors", "Max Motors"],
      url: SITE_CONFIG.url,
      inLanguage: SITE_CONFIG.locale,
      publisher: { "@id": `${SITE_CONFIG.url}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_CONFIG.url}/cars?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    breadcrumb: {
      ...baseStructure,
      "@type": "BreadcrumbList",
      itemListElement: data.items?.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
    article: {
      ...baseStructure,
      "@type": "Article",
      headline: data.title,
      description: data.description,
      image: data.image,
      datePublished: data.datePublished,
      dateModified: data.dateModified,
      author: {
        "@type": "Person",
        name: data.author || SITE_CONFIG.name,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_CONFIG.url}/logo.jpg`,
        },
      },
      mainEntityOfPage: data.url,
    },
  };

  return compact(schemas[type] || baseStructure);
};

/**
 * Generate SEO-friendly URL slug
 */
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .trim("-");
};

/**
 * Generate car listing meta tags
 */
export const generateCarMetadata = (car) => {
  const make = car.make || car.brand || "";
  const model = car.model || "";
  const year = car.year || "";
  const title = `${year} ${make} ${model}`.replace(/\s+/g, " ").trim();
  const keywords = [
    title,
    `سيارة ${make}`,
    `${make} ${model} السعودية`,
    car.bodyType,
    car.fuelType,
    car.price && `${title} ${car.price} ريال`,
  ].filter(Boolean);

  return generateMetadata({
    // The root layout's title template already appends the brand — repeating it
    // here produced "… | ماكس موتورز | ماكس موتورز" on every car page.
    title: `${title} للبيع`,
    description: truncate(`${title} - ${car.description || "سيارة متاحة لدى ماكس موتورز"}. السعر: ${car.price} ريال سعودي. احجز تجربة القيادة أو اطلب التمويل الآن.`, 160),
    keywords,
    ogImage: car.images?.[0] || car.image || SITE_CONFIG.defaultOgImage,
    canonicalUrl: `${SITE_CONFIG.url}/cars/${car.id}`,
    // Next.js Metadata API only accepts standard Open Graph types (e.g. website, article).
    ogType: "website",
    other: {
      "og:type": "product",
    },
  });
};

/**
 * Get SEO analytics data
 */
export const SEO_ANALYTICS = {
  pageViewTracking: true,
  eventTracking: true,
  searchTracking: true,
  conversionTracking: true,
};
