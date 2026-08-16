import "server-only";

import { cache } from "react";
import * as repository from "./site-content.repository";
import {
  storeInfoSchema,
  socialMediaSchema,
  logoSchema,
  heroSectionSchema,
  aboutPageSchema,
  aboutFeatureSchema,
  pixelSettingsSchema,
  dealershipInfoSchema,
  workingHoursSchema,
  idSchema,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  type LogoType,
} from "./site-content.schema";
import {
  toStoreInfoDto,
  toSocialMediaDto,
  toLogoDto,
  toHeroSectionDto,
  toAboutPageDto,
  toAboutFeatureDto,
  toPixelSettingsDto,
  toDealershipInfoDto,
  type StoreInfoDto,
  type SocialMediaDto,
  type LogoDto,
  type HeroSectionDto,
  type AboutPageDto,
  type AboutFeatureDto,
  type PixelSettingsDto,
  type DealershipInfoDto,
  type SiteChrome,
} from "./site-content.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { deleteFiles, storagePathFromUrl } from "@/server/db/storage";
import { logger } from "@/lib/logger";

/**
 * Reads here are wrapped in `cache()` because the chrome is needed by the
 * layout, the footer and often the page itself within one render. Without it
 * the same row is fetched three times per request.
 */

// --- Public reads ----------------------------------------------------------

export const getStoreInfo = cache(async (): Promise<StoreInfoDto> => {
  return toStoreInfoDto(await repository.getStoreInfo());
});

export const getSocialLinks = cache(async (): Promise<SocialMediaDto[]> => {
  const links = await repository.listSocialMedia(true);

  // A platform the UI has no icon for would render as an unlabelled link.
  return links
    .filter((link): boolean =>
      (SOCIAL_PLATFORMS as readonly string[]).includes(link.platform),
    )
    .map(toSocialMediaDto);
});

export const getActiveLogo = cache(
  async (type: LogoType = "main"): Promise<LogoDto | null> => {
    const logo = await repository.findActiveLogo(type);
    return logo ? toLogoDto(logo) : null;
  },
);

export const getHeroSection = cache(async (): Promise<HeroSectionDto> => {
  return toHeroSectionDto(await repository.getHeroSection());
});

export const getPixelSettings = cache(async (): Promise<PixelSettingsDto> => {
  return toPixelSettingsDto(await repository.getPixelSettings());
});

/** Published about page, or null when an editor has it hidden. */
export const getAboutPage = cache(async (): Promise<AboutPageDto | null> => {
  const page = await repository.getAboutPage(true);
  return page.isPublished ? toAboutPageDto(page) : null;
});

/** Everything the header, footer and WhatsApp button need, in one round trip. */
export const getSiteChrome = cache(async (): Promise<SiteChrome> => {
  const [store, logo, social] = await Promise.all([
    getStoreInfo(),
    getActiveLogo("main"),
    getSocialLinks(),
  ]);

  return { store, logo, social };
});

export const getDealershipInfo = cache(async (): Promise<DealershipInfoDto> => {
  return toDealershipInfoDto(await repository.getDealershipInfo());
});

// --- Admin reads -----------------------------------------------------------

export async function getAboutPageForAdmin(): Promise<AboutPageDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return toAboutPageDto(await repository.getAboutPage(false));
}

export async function listAllSocialLinks(): Promise<SocialMediaDto[]> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return (await repository.listSocialMedia(false)).map(toSocialMediaDto);
}

export async function listLogos(): Promise<LogoDto[]> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return (await repository.listLogos()).map(toLogoDto);
}

// --- Writes ----------------------------------------------------------------

export async function updateStoreInfo(input: unknown): Promise<StoreInfoDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(storeInfoSchema, input, "store info");
  const current = await repository.getStoreInfo();

  logger.info("siteContent.storeInfo.updated", { id: current.id });
  return toStoreInfoDto(await repository.updateStoreInfo(current.id, data));
}

export async function createSocialLink(input: unknown): Promise<SocialMediaDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(socialMediaSchema, input, "social link");

  // `platform` is unique — surface that as a domain conflict rather than
  // letting Prisma's P2002 surface as an opaque internal error.
  const existing = await repository.findSocialMediaByPlatform(data.platform);
  if (existing) throw AppError.conflict(`Social link for ${data.platform} already exists`);

  return toSocialMediaDto(await repository.createSocialMedia(data));
}

export async function updateSocialLink(
  id: string,
  input: unknown,
): Promise<SocialMediaDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const linkId = parseOrThrow(idSchema, id, "id");
  const data = parseOrThrow(socialMediaSchema.partial(), input, "social link");

  return toSocialMediaDto(await repository.updateSocialMedia(linkId, data));
}

export async function deleteSocialLink(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await repository.deleteSocialMedia(parseOrThrow(idSchema, id, "id"));
}

export async function createLogo(input: unknown): Promise<LogoDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(logoSchema, input, "logo");
  const logo = await repository.createLogo(data);

  // A new logo marked active must be the only active one of its type.
  if (data.isActive) await repository.setActiveLogo(logo.id, data.type);

  return toLogoDto(logo);
}

export async function activateLogo(id: string): Promise<LogoDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const logoId = parseOrThrow(idSchema, id, "id");
  const logo = await repository.findLogoById(logoId);
  if (!logo) throw AppError.notFound("Logo");

  return toLogoDto(await repository.setActiveLogo(logoId, logo.type));
}

export async function deleteLogo(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const logoId = parseOrThrow(idSchema, id, "id");
  const logo = await repository.findLogoById(logoId);
  if (!logo) throw AppError.notFound("Logo");

  // Removing the logo the header is currently using would leave the site
  // without one; require the editor to activate another first.
  if (logo.isActive) {
    throw AppError.conflict("Cannot delete the active logo — activate another first");
  }

  await repository.deleteLogo(logoId);

  const path = storagePathFromUrl(logo.imageUrl);
  if (path) await deleteFiles([path]);
}

export async function updateHeroSection(input: unknown): Promise<HeroSectionDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(heroSectionSchema, input, "hero section");
  const current = await repository.getHeroSection();

  return toHeroSectionDto(await repository.updateHeroSection(current.id, data));
}

export async function updateAboutPage(input: unknown): Promise<AboutPageDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(aboutPageSchema, input, "about page");
  const current = await repository.getAboutPage(false);

  return toAboutPageDto(await repository.updateAboutPage(current.id, data));
}

export async function createAboutFeature(input: unknown): Promise<AboutFeatureDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(aboutFeatureSchema, input, "about feature");
  const page = await repository.getAboutPage(false);

  return toAboutFeatureDto(
    await repository.createAboutFeature({
      ...data,
      aboutPage: { connect: { id: page.id } },
    }),
  );
}

export async function updateAboutFeature(
  id: string,
  input: unknown,
): Promise<AboutFeatureDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const featureId = parseOrThrow(idSchema, id, "id");
  const data = parseOrThrow(aboutFeatureSchema.partial(), input, "about feature");

  return toAboutFeatureDto(await repository.updateAboutFeature(featureId, data));
}

export async function deleteAboutFeature(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await repository.deleteAboutFeature(parseOrThrow(idSchema, id, "id"));
}

export async function updatePixelSettings(input: unknown): Promise<PixelSettingsDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(pixelSettingsSchema, input, "pixel settings");
  const current = await repository.getPixelSettings();

  return toPixelSettingsDto(await repository.updatePixelSettings(current.id, data));
}

export async function updateDealershipInfo(input: unknown): Promise<DealershipInfoDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(dealershipInfoSchema, input, "dealership info");
  const current = await repository.getDealershipInfo();

  return toDealershipInfoDto(await repository.updateDealershipInfo(current.id, data));
}

export async function saveWorkingHours(input: unknown): Promise<DealershipInfoDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const hours = parseOrThrow(workingHoursSchema, input, "working hours");
  const dealership = await repository.getDealershipInfo();

  await repository.saveWorkingHours(dealership.id, hours);
  logger.info("siteContent.workingHours.saved", { days: hours.length });

  return getDealershipInfoFresh();
}

/** Bypasses the request cache — used right after a write. */
async function getDealershipInfoFresh(): Promise<DealershipInfoDto> {
  return toDealershipInfoDto(await repository.getDealershipInfo());
}

export type { SocialPlatform, LogoType };
