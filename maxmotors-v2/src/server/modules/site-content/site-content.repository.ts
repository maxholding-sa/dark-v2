import "server-only";

import type {
  AboutFeature,
  AboutPage,
  DealershipInfo,
  HeroSection,
  Logo,
  PixelSettings,
  Prisma,
  SocialMedia,
  StoreInfo,
  WorkingHour,
} from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import type { DayOfWeek } from "./site-content.schema";

/**
 * Site content lives in a set of singleton tables — one store, one hero, one
 * about page. Prisma has no "the row" primitive, so each getter takes the first
 * row and creates a seeded default when the table is empty. That keeps a fresh
 * database renderable instead of 500-ing on an editor's first visit.
 */

// --- Store info ------------------------------------------------------------

export async function getStoreInfo(): Promise<StoreInfo> {
  return withDbRetry(async () => {
    const existing = await prisma.storeInfo.findFirst();
    if (existing) return existing;

    return prisma.storeInfo.create({ data: {} });
  });
}

export async function updateStoreInfo(
  id: string,
  data: Prisma.StoreInfoUpdateInput,
): Promise<StoreInfo> {
  return withDbRetry(() => prisma.storeInfo.update({ where: { id }, data }));
}

// --- Social media ----------------------------------------------------------

export async function listSocialMedia(activeOnly: boolean): Promise<SocialMedia[]> {
  return withDbRetry(() =>
    prisma.socialMedia.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ order: "asc" }, { platform: "asc" }],
    }),
  );
}

export async function createSocialMedia(
  data: Prisma.SocialMediaCreateInput,
): Promise<SocialMedia> {
  return withDbRetry(() => prisma.socialMedia.create({ data }));
}

export async function updateSocialMedia(
  id: string,
  data: Prisma.SocialMediaUpdateInput,
): Promise<SocialMedia> {
  return withDbRetry(() => prisma.socialMedia.update({ where: { id }, data }));
}

export async function deleteSocialMedia(id: string): Promise<void> {
  await withDbRetry(() => prisma.socialMedia.delete({ where: { id } }));
}

export async function findSocialMediaByPlatform(
  platform: string,
): Promise<SocialMedia | null> {
  return withDbRetry(() => prisma.socialMedia.findUnique({ where: { platform } }));
}

// --- Logos -----------------------------------------------------------------

export async function listLogos(): Promise<Logo[]> {
  return withDbRetry(() =>
    prisma.logo.findMany({ orderBy: [{ type: "asc" }, { createdAt: "desc" }] }),
  );
}

export async function findActiveLogo(type: string): Promise<Logo | null> {
  return withDbRetry(() =>
    prisma.logo.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function findLogoById(id: string): Promise<Logo | null> {
  return withDbRetry(() => prisma.logo.findUnique({ where: { id } }));
}

export async function createLogo(data: Prisma.LogoCreateInput): Promise<Logo> {
  return withDbRetry(() => prisma.logo.create({ data }));
}

export async function updateLogo(
  id: string,
  data: Prisma.LogoUpdateInput,
): Promise<Logo> {
  return withDbRetry(() => prisma.logo.update({ where: { id }, data }));
}

export async function deleteLogo(id: string): Promise<void> {
  await withDbRetry(() => prisma.logo.delete({ where: { id } }));
}

/**
 * Makes one logo of a type the active one. A transaction, because a moment
 * where two logos of the same type are active would let the header pick the
 * wrong one.
 */
export async function setActiveLogo(id: string, type: string): Promise<Logo> {
  return withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      await tx.logo.updateMany({
        where: { type, id: { not: id } },
        data: { isActive: false },
      });
      return tx.logo.update({ where: { id }, data: { isActive: true } });
    }),
  );
}

// --- Hero section ----------------------------------------------------------

export async function getHeroSection(): Promise<HeroSection> {
  return withDbRetry(async () => {
    const existing = await prisma.heroSection.findFirst();
    if (existing) return existing;

    return prisma.heroSection.create({ data: { videoUrl: "/hero1.mp4" } });
  });
}

export async function updateHeroSection(
  id: string,
  data: Prisma.HeroSectionUpdateInput,
): Promise<HeroSection> {
  return withDbRetry(() => prisma.heroSection.update({ where: { id }, data }));
}

// --- About page ------------------------------------------------------------

export type AboutPageWithFeatures = AboutPage & { features: AboutFeature[] };

export async function getAboutPage(
  activeFeaturesOnly: boolean,
): Promise<AboutPageWithFeatures> {
  const featureFilter = {
    where: activeFeaturesOnly ? { isActive: true } : {},
    orderBy: { order: "asc" as const },
  };

  return withDbRetry(async () => {
    const existing = await prisma.aboutPage.findFirst({
      include: { features: featureFilter },
    });
    if (existing) return existing;

    return prisma.aboutPage.create({
      data: {
        introText: "",
        visionParagraph1: "",
        visionParagraph2: "",
        missionParagraph1: "",
        missionParagraph2: "",
        ctaText: "",
      },
      include: { features: featureFilter },
    });
  });
}

export async function updateAboutPage(
  id: string,
  data: Prisma.AboutPageUpdateInput,
): Promise<AboutPageWithFeatures> {
  return withDbRetry(() =>
    prisma.aboutPage.update({
      where: { id },
      data,
      include: { features: { orderBy: { order: "asc" } } },
    }),
  );
}

export async function createAboutFeature(
  data: Prisma.AboutFeatureCreateInput,
): Promise<AboutFeature> {
  return withDbRetry(() => prisma.aboutFeature.create({ data }));
}

export async function updateAboutFeature(
  id: string,
  data: Prisma.AboutFeatureUpdateInput,
): Promise<AboutFeature> {
  return withDbRetry(() => prisma.aboutFeature.update({ where: { id }, data }));
}

export async function deleteAboutFeature(id: string): Promise<void> {
  await withDbRetry(() => prisma.aboutFeature.delete({ where: { id } }));
}

// --- Pixels ----------------------------------------------------------------

export async function getPixelSettings(): Promise<PixelSettings> {
  return withDbRetry(async () => {
    const existing = await prisma.pixelSettings.findFirst();
    if (existing) return existing;

    return prisma.pixelSettings.create({ data: {} });
  });
}

export async function updatePixelSettings(
  id: string,
  data: Prisma.PixelSettingsUpdateInput,
): Promise<PixelSettings> {
  return withDbRetry(() => prisma.pixelSettings.update({ where: { id }, data }));
}

// --- Dealership + working hours -------------------------------------------

export type DealershipWithHours = DealershipInfo & { workingHours: WorkingHour[] };

export async function getDealershipInfo(): Promise<DealershipWithHours> {
  return withDbRetry(async () => {
    const existing = await prisma.dealershipInfo.findFirst({
      include: { workingHours: true },
    });
    if (existing) return existing;

    return prisma.dealershipInfo.create({
      data: {},
      include: { workingHours: true },
    });
  });
}

export async function updateDealershipInfo(
  id: string,
  data: Prisma.DealershipInfoUpdateInput,
): Promise<DealershipWithHours> {
  return withDbRetry(() =>
    prisma.dealershipInfo.update({
      where: { id },
      data,
      include: { workingHours: true },
    }),
  );
}

/**
 * Replaces the whole week atomically.
 *
 * Upsert per day rather than delete-then-insert: the delete path leaves the
 * site with no opening hours if the insert fails, and a booking form reading
 * mid-transaction would see none.
 */
export async function saveWorkingHours(
  dealershipId: string,
  hours: {
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  }[],
): Promise<WorkingHour[]> {
  return withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      for (const hour of hours) {
        await tx.workingHour.upsert({
          where: {
            dealershipId_dayOfWeek: { dealershipId, dayOfWeek: hour.dayOfWeek },
          },
          update: {
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isOpen: hour.isOpen,
          },
          create: { dealershipId, ...hour },
        });
      }

      return tx.workingHour.findMany({ where: { dealershipId } });
    }),
  );
}
