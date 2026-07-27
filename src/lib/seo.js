/**
 * SEO Configuration and utilities for ماكس موتورز - MaxMotors
 * Market: Saudi Arabia
 */

export const SITE_CONFIG = {
  name: "ماكس موتورز",
  englishName: "maxmotors",
  description: "ماكس موتورز - منصة سعودية لشراء السيارات الجديدة والمستعملة، حجز تجربة القيادة، ومقارنة العروض التمويلية بثقة وسهولة.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://maxmotors.sa").replace(/\/$/, ""),
  locale: "ar-SA",
  lang: "ar",
  defaultOgImage: "/logo.JPG",
  twitterHandle: "@maxmotors_sa",
};

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
          width: 1200,
          height: 630,
          alt: title || SITE_CONFIG.name,
        },
        {
          url: absoluteUrl(ogImage),
          width: 800,
          height: 600,
          alt: title || SITE_CONFIG.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
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
      name: SITE_CONFIG.name,
      alternateName: SITE_CONFIG.englishName,
      url: SITE_CONFIG.url,
      logo: `${SITE_CONFIG.url}/logo.JPG`,
      description: SITE_CONFIG.description,
      sameAs: [
        "https://twitter.com/maxmotors_sa",
        "https://www.instagram.com/maxmotors_sa",
        "https://www.facebook.com/maxmotors_sa",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Service",
        telephone: "+966-XX-XXX-XXXX",
        areaServed: "SA",
        availableLanguage: ["ar", "en"],
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "SA",
        addressRegion: "Riyadh",
        postalCode: "11537",
      },
    },
    localBusiness: {
      ...baseStructure,
      "@type": "AutoDealer",
      name: SITE_CONFIG.name,
      image: `${SITE_CONFIG.url}/logo.JPG`,
      description: SITE_CONFIG.description,
      url: SITE_CONFIG.url,
      telephone: "+966-XX-XXX-XXXX",
      address: {
        "@type": "PostalAddress",
        streetAddress: "King Fahd Road",
        addressLocality: "Riyadh",
        addressRegion: "Riyadh",
        postalCode: "11537",
        addressCountry: "SA",
      },
      areaServed: SAUDI_MARKET_KEYWORDS.locations,
      priceRange: "$$",
      sameAs: [
        "https://twitter.com/maxmotors_sa",
        "https://www.instagram.com/maxmotors_sa",
      ],
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
      name: SITE_CONFIG.name,
      alternateName: SITE_CONFIG.englishName,
      url: SITE_CONFIG.url,
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
          url: `${SITE_CONFIG.url}/logo.JPG`,
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
    title: `${title} للبيع | ماكس موتورز`,
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
