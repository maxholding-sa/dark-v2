import "server-only";

import type { FeaturedBrand, FeaturedModel, Mandeb, Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";

/** Curated lists are small, so every read returns the whole list unpaginated. */

const orderedBy = [{ order: "asc" as const }, { createdAt: "asc" as const }];

// --- Featured brands -------------------------------------------------------

export async function listBrands(activeOnly: boolean): Promise<FeaturedBrand[]> {
  return withDbRetry(() =>
    prisma.featuredBrand.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: orderedBy,
    }),
  );
}

export async function findBrandById(id: string): Promise<FeaturedBrand | null> {
  return withDbRetry(() => prisma.featuredBrand.findUnique({ where: { id } }));
}

export async function createBrand(
  data: Prisma.FeaturedBrandCreateInput,
): Promise<FeaturedBrand> {
  return withDbRetry(() => prisma.featuredBrand.create({ data }));
}

export async function updateBrand(
  id: string,
  data: Prisma.FeaturedBrandUpdateInput,
): Promise<FeaturedBrand> {
  return withDbRetry(() => prisma.featuredBrand.update({ where: { id }, data }));
}

export async function deleteBrand(id: string): Promise<void> {
  await withDbRetry(() => prisma.featuredBrand.delete({ where: { id } }));
}

// --- Featured models -------------------------------------------------------

export async function listModels(activeOnly: boolean): Promise<FeaturedModel[]> {
  return withDbRetry(() =>
    prisma.featuredModel.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: orderedBy,
    }),
  );
}

export async function findModelById(id: string): Promise<FeaturedModel | null> {
  return withDbRetry(() => prisma.featuredModel.findUnique({ where: { id } }));
}

export async function createModel(
  data: Prisma.FeaturedModelCreateInput,
): Promise<FeaturedModel> {
  return withDbRetry(() => prisma.featuredModel.create({ data }));
}

export async function updateModel(
  id: string,
  data: Prisma.FeaturedModelUpdateInput,
): Promise<FeaturedModel> {
  return withDbRetry(() => prisma.featuredModel.update({ where: { id }, data }));
}

export async function deleteModel(id: string): Promise<void> {
  await withDbRetry(() => prisma.featuredModel.delete({ where: { id } }));
}

// --- Reordering ------------------------------------------------------------

/**
 * Writes every position in one transaction. A partial reorder would leave two
 * items claiming the same slot, and the list order would then depend on the
 * `createdAt` tiebreak rather than what the editor dragged.
 */
export async function reorderBrands(
  positions: { id: string; order: number }[],
): Promise<void> {
  await withDbRetry(() =>
    prisma.$transaction(
      positions.map(({ id, order }) =>
        prisma.featuredBrand.update({ where: { id }, data: { order } }),
      ),
    ),
  );
}

export async function reorderModels(
  positions: { id: string; order: number }[],
): Promise<void> {
  await withDbRetry(() =>
    prisma.$transaction(
      positions.map(({ id, order }) =>
        prisma.featuredModel.update({ where: { id }, data: { order } }),
      ),
    ),
  );
}

// --- Mandebs ---------------------------------------------------------------

export async function listMandebs(): Promise<Mandeb[]> {
  return withDbRetry(() =>
    prisma.mandeb.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] }),
  );
}

export async function findMandebById(id: string): Promise<Mandeb | null> {
  return withDbRetry(() => prisma.mandeb.findUnique({ where: { id } }));
}

export async function createMandeb(data: Prisma.MandebCreateInput): Promise<Mandeb> {
  return withDbRetry(() => prisma.mandeb.create({ data }));
}

export async function updateMandeb(
  id: string,
  data: Prisma.MandebUpdateInput,
): Promise<Mandeb> {
  return withDbRetry(() => prisma.mandeb.update({ where: { id }, data }));
}

export async function deleteMandeb(id: string): Promise<void> {
  await withDbRetry(() => prisma.mandeb.delete({ where: { id } }));
}
