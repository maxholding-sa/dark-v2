import type {
  AboutFeature,
  AboutPage,
  DealershipInfo,
  HeroSection,
  Logo,
  PixelSettings,
  SocialMedia,
  StoreInfo,
  WorkingHour,
} from "@prisma/client";
import type { DayOfWeek, LogoType, SocialPlatform } from "./site-content.schema";

/**
 * DTOs for site content. Dates become ISO strings; everything else is already
 * primitive, so these are mostly one-to-one with the models — the value is that
 * the boundary is explicit and a schema change cannot silently reach the UI.
 */

export interface StoreInfoDto {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  latitude: string | null;
  longitude: string | null;
  whatsappEnabled: boolean;
  whatsappLabel: string | null;
  whatsappText: string | null;
}

export interface SocialMediaDto {
  id: string;
  platform: SocialPlatform;
  url: string;
  icon: string | null;
  order: number;
  isActive: boolean;
}

export interface LogoDto {
  id: string;
  imageUrl: string;
  altText: string;
  type: LogoType;
  isActive: boolean;
}

export interface HeroSectionDto {
  id: string;
  videoUrl: string;
  title: string;
  subtitle: string | null;
  posterImage: string | null;
  isActive: boolean;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
}

export interface AboutFeatureDto {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  isActive: boolean;
}

export interface AboutPageDto {
  id: string;
  title: string;
  introText: string;
  visionTitle: string;
  visionParagraph1: string;
  visionParagraph2: string;
  visionImage: string | null;
  visionImageAlt: string | null;
  missionTitle: string;
  missionParagraph1: string;
  missionParagraph2: string;
  missionImage: string | null;
  missionImageAlt: string | null;
  whyUsTitle: string;
  ctaTitle: string;
  ctaText: string;
  isPublished: boolean;
  metaDescription: string | null;
  metaKeywords: string | null;
  features: AboutFeatureDto[];
}

export interface PixelSettingsDto {
  id: string;
  facebookPixel: string | null;
  googleAnalytics: string | null;
  googleAdsId: string | null;
  tiktokPixel: string | null;
  snapchatPixel: string | null;
  microsoftClarity: string | null;
}

export interface WorkingHourDto {
  id: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface DealershipInfoDto {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  workingHours: WorkingHourDto[];
}

/**
 * Everything the site chrome needs, in one object.
 *
 * The header, footer and floating WhatsApp button each need a slice of this.
 * Fetching it once in the layout and passing it down costs one query per
 * render instead of one per component — v1's footer alone made three.
 */
export interface SiteChrome {
  store: StoreInfoDto;
  logo: LogoDto | null;
  social: SocialMediaDto[];
}

export function toStoreInfoDto(store: StoreInfo): StoreInfoDto {
  return {
    id: store.id,
    name: store.name,
    description: store.description,
    address: store.address,
    city: store.city,
    country: store.country,
    phone: store.phone,
    whatsapp: store.whatsapp,
    email: store.email,
    latitude: store.latitude,
    longitude: store.longitude,
    whatsappEnabled: store.whatsappEnabled,
    whatsappLabel: store.whatsappLabel,
    whatsappText: store.whatsappText,
  };
}

export function toSocialMediaDto(social: SocialMedia): SocialMediaDto {
  return {
    id: social.id,
    // Stored as free text; anything the UI has no icon for is dropped by the
    // service rather than rendered as a broken link.
    platform: social.platform as SocialPlatform,
    url: social.url,
    icon: social.icon,
    order: social.order,
    isActive: social.isActive,
  };
}

export function toLogoDto(logo: Logo): LogoDto {
  return {
    id: logo.id,
    imageUrl: logo.imageUrl,
    altText: logo.altText,
    type: logo.type as LogoType,
    isActive: logo.isActive,
  };
}

export function toHeroSectionDto(hero: HeroSection): HeroSectionDto {
  return {
    id: hero.id,
    videoUrl: hero.videoUrl,
    title: hero.title,
    subtitle: hero.subtitle,
    posterImage: hero.posterImage,
    isActive: hero.isActive,
    autoplay: hero.autoplay,
    loop: hero.loop,
    muted: hero.muted,
  };
}

export function toAboutFeatureDto(feature: AboutFeature): AboutFeatureDto {
  return {
    id: feature.id,
    title: feature.title,
    description: feature.description,
    icon: feature.icon,
    order: feature.order,
    isActive: feature.isActive,
  };
}

export function toAboutPageDto(
  page: AboutPage & { features: AboutFeature[] },
): AboutPageDto {
  return {
    id: page.id,
    title: page.title,
    introText: page.introText,
    visionTitle: page.visionTitle,
    visionParagraph1: page.visionParagraph1,
    visionParagraph2: page.visionParagraph2,
    visionImage: page.visionImage,
    visionImageAlt: page.visionImageAlt,
    missionTitle: page.missionTitle,
    missionParagraph1: page.missionParagraph1,
    missionParagraph2: page.missionParagraph2,
    missionImage: page.missionImage,
    missionImageAlt: page.missionImageAlt,
    whyUsTitle: page.whyUsTitle,
    ctaTitle: page.ctaTitle,
    ctaText: page.ctaText,
    isPublished: page.isPublished,
    metaDescription: page.metaDescription,
    metaKeywords: page.metaKeywords,
    features: page.features.map(toAboutFeatureDto),
  };
}

export function toPixelSettingsDto(pixels: PixelSettings): PixelSettingsDto {
  return {
    id: pixels.id,
    facebookPixel: pixels.facebookPixel,
    googleAnalytics: pixels.googleAnalytics,
    googleAdsId: pixels.googleAdsId,
    tiktokPixel: pixels.tiktokPixel,
    snapchatPixel: pixels.snapchatPixel,
    microsoftClarity: pixels.microsoftClarity,
  };
}

export function toWorkingHourDto(hour: WorkingHour): WorkingHourDto {
  return {
    id: hour.id,
    dayOfWeek: hour.dayOfWeek as DayOfWeek,
    openTime: hour.openTime,
    closeTime: hour.closeTime,
    isOpen: hour.isOpen,
  };
}

export function toDealershipInfoDto(
  dealership: DealershipInfo & { workingHours: WorkingHour[] },
): DealershipInfoDto {
  return {
    id: dealership.id,
    name: dealership.name,
    address: dealership.address,
    phone: dealership.phone,
    email: dealership.email,
    workingHours: dealership.workingHours.map(toWorkingHourDto),
  };
}
