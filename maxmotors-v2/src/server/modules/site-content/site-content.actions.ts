"use server";

import { revalidatePath } from "next/cache";
import * as service from "./site-content.service";
import { toResult, type Result } from "@/server/errors/result";
import type {
  StoreInfoDto,
  SocialMediaDto,
  LogoDto,
  HeroSectionDto,
  AboutPageDto,
  AboutFeatureDto,
  PixelSettingsDto,
  DealershipInfoDto,
} from "./site-content.types";

/**
 * Site content appears in the layout, so a change has to invalidate every
 * page — hence `revalidatePath("/", "layout")` rather than a list of routes
 * that would silently go stale as pages are added.
 */
function revalidateChrome(): void {
  revalidatePath("/", "layout");
}

export async function updateStoreInfoAction(
  input: unknown,
): Promise<Result<StoreInfoDto>> {
  return toResult(async () => {
    const store = await service.updateStoreInfo(input);
    revalidateChrome();
    return store;
  });
}

export async function createSocialLinkAction(
  input: unknown,
): Promise<Result<SocialMediaDto>> {
  return toResult(async () => {
    const link = await service.createSocialLink(input);
    revalidateChrome();
    return link;
  });
}

export async function updateSocialLinkAction(
  id: string,
  input: unknown,
): Promise<Result<SocialMediaDto>> {
  return toResult(async () => {
    const link = await service.updateSocialLink(id, input);
    revalidateChrome();
    return link;
  });
}

export async function deleteSocialLinkAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteSocialLink(id);
    revalidateChrome();
    return { id };
  });
}

export async function createLogoAction(input: unknown): Promise<Result<LogoDto>> {
  return toResult(async () => {
    const logo = await service.createLogo(input);
    revalidateChrome();
    return logo;
  });
}

export async function activateLogoAction(id: string): Promise<Result<LogoDto>> {
  return toResult(async () => {
    const logo = await service.activateLogo(id);
    revalidateChrome();
    return logo;
  });
}

export async function deleteLogoAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteLogo(id);
    revalidateChrome();
    return { id };
  });
}

export async function updateHeroSectionAction(
  input: unknown,
): Promise<Result<HeroSectionDto>> {
  return toResult(async () => {
    const hero = await service.updateHeroSection(input);
    revalidatePath("/");
    return hero;
  });
}

export async function updateAboutPageAction(
  input: unknown,
): Promise<Result<AboutPageDto>> {
  return toResult(async () => {
    const page = await service.updateAboutPage(input);
    revalidatePath("/about");
    return page;
  });
}

export async function createAboutFeatureAction(
  input: unknown,
): Promise<Result<AboutFeatureDto>> {
  return toResult(async () => {
    const feature = await service.createAboutFeature(input);
    revalidatePath("/about");
    return feature;
  });
}

export async function updateAboutFeatureAction(
  id: string,
  input: unknown,
): Promise<Result<AboutFeatureDto>> {
  return toResult(async () => {
    const feature = await service.updateAboutFeature(id, input);
    revalidatePath("/about");
    return feature;
  });
}

export async function deleteAboutFeatureAction(
  id: string,
): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteAboutFeature(id);
    revalidatePath("/about");
    return { id };
  });
}

export async function updatePixelSettingsAction(
  input: unknown,
): Promise<Result<PixelSettingsDto>> {
  return toResult(async () => {
    const pixels = await service.updatePixelSettings(input);
    revalidateChrome();
    return pixels;
  });
}

export async function updateDealershipInfoAction(
  input: unknown,
): Promise<Result<DealershipInfoDto>> {
  return toResult(async () => {
    const dealership = await service.updateDealershipInfo(input);
    revalidateChrome();
    return dealership;
  });
}

export async function saveWorkingHoursAction(
  input: unknown,
): Promise<Result<DealershipInfoDto>> {
  return toResult(async () => {
    const dealership = await service.saveWorkingHours(input);
    revalidateChrome();
    return dealership;
  });
}
