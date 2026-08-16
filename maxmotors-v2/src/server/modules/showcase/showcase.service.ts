import "server-only";

import { cache } from "react";
import * as repository from "./showcase.repository";
import {
  featuredBrandSchema,
  featuredModelSchema,
  mandebSchema,
  reorderSchema,
  idSchema,
} from "./showcase.schema";
import {
  toFeaturedBrandDto,
  toFeaturedModelDto,
  toMandebDto,
  type FeaturedItemDto,
  type MandebDto,
} from "./showcase.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { deleteFiles, storagePathFromUrl } from "@/server/db/storage";
import { logger } from "@/lib/logger";

/** Removes a replaced or deleted image from storage; never fails the write. */
async function cleanupImage(url: string | null | undefined): Promise<void> {
  if (!url) return;

  const path = storagePathFromUrl(url);
  if (path) await deleteFiles([path]);
}

// --- Featured brands -------------------------------------------------------

export const getFeaturedBrands = cache(async (): Promise<FeaturedItemDto[]> => {
  return (await repository.listBrands(true)).map(toFeaturedBrandDto);
});

export async function listBrandsForAdmin(): Promise<FeaturedItemDto[]> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return (await repository.listBrands(false)).map(toFeaturedBrandDto);
}

export async function createFeaturedBrand(input: unknown): Promise<FeaturedItemDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(featuredBrandSchema, input, "featured brand");
  return toFeaturedBrandDto(await repository.createBrand(data));
}

export async function updateFeaturedBrand(
  id: string,
  input: unknown,
): Promise<FeaturedItemDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const brandId = parseOrThrow(idSchema, id, "id");
  const data = parseOrThrow(featuredBrandSchema.partial(), input, "featured brand");

  const existing = await repository.findBrandById(brandId);
  if (!existing) throw AppError.notFound("Featured brand");

  const brand = await repository.updateBrand(brandId, data);

  if (data.image && data.image !== existing.image) await cleanupImage(existing.image);

  return toFeaturedBrandDto(brand);
}

export async function deleteFeaturedBrand(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const brandId = parseOrThrow(idSchema, id, "id");
  const brand = await repository.findBrandById(brandId);
  if (!brand) throw AppError.notFound("Featured brand");

  await repository.deleteBrand(brandId);
  await cleanupImage(brand.image);

  logger.info("showcase.brand.deleted", { brandId });
}

export async function reorderFeaturedBrands(input: unknown): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await repository.reorderBrands(parseOrThrow(reorderSchema, input, "order"));
}

// --- Featured models -------------------------------------------------------

export const getFeaturedModels = cache(async (): Promise<FeaturedItemDto[]> => {
  return (await repository.listModels(true)).map(toFeaturedModelDto);
});

export async function listModelsForAdmin(): Promise<FeaturedItemDto[]> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  return (await repository.listModels(false)).map(toFeaturedModelDto);
}

export async function createFeaturedModel(input: unknown): Promise<FeaturedItemDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(featuredModelSchema, input, "featured model");
  return toFeaturedModelDto(await repository.createModel(data));
}

export async function updateFeaturedModel(
  id: string,
  input: unknown,
): Promise<FeaturedItemDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const modelId = parseOrThrow(idSchema, id, "id");
  const data = parseOrThrow(featuredModelSchema.partial(), input, "featured model");

  const existing = await repository.findModelById(modelId);
  if (!existing) throw AppError.notFound("Featured model");

  const model = await repository.updateModel(modelId, data);

  if (data.image && data.image !== existing.image) await cleanupImage(existing.image);

  return toFeaturedModelDto(model);
}

export async function deleteFeaturedModel(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const modelId = parseOrThrow(idSchema, id, "id");
  const model = await repository.findModelById(modelId);
  if (!model) throw AppError.notFound("Featured model");

  await repository.deleteModel(modelId);
  await cleanupImage(model.image);
}

export async function reorderFeaturedModels(input: unknown): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await repository.reorderModels(parseOrThrow(reorderSchema, input, "order"));
}

// --- Mandebs ---------------------------------------------------------------

/**
 * Field agents shown on a car page so a buyer can call someone local. Public —
 * these are business contact details, published deliberately.
 */
export const getMandebs = cache(async (): Promise<MandebDto[]> => {
  return (await repository.listMandebs()).map(toMandebDto);
});

export async function createMandeb(input: unknown): Promise<MandebDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(mandebSchema, input, "mandeb");
  return toMandebDto(await repository.createMandeb(data));
}

export async function updateMandeb(id: string, input: unknown): Promise<MandebDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const mandebId = parseOrThrow(idSchema, id, "id");
  const data = parseOrThrow(mandebSchema.partial(), input, "mandeb");

  const existing = await repository.findMandebById(mandebId);
  if (!existing) throw AppError.notFound("Mandeb");

  return toMandebDto(await repository.updateMandeb(mandebId, data));
}

export async function deleteMandeb(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await repository.deleteMandeb(parseOrThrow(idSchema, id, "id"));
}
