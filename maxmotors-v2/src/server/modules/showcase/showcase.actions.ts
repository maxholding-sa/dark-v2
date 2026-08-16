"use server";

import { revalidatePath } from "next/cache";
import * as service from "./showcase.service";
import { toResult, type Result } from "@/server/errors/result";
import type { FeaturedItemDto, MandebDto } from "./showcase.types";

/** Curated lists appear on the home page; a change invalidates it. */
function revalidateShowcase(adminPath: string): void {
  revalidatePath("/");
  revalidatePath(adminPath);
}

export async function createFeaturedBrandAction(
  input: unknown,
): Promise<Result<FeaturedItemDto>> {
  return toResult(async () => {
    const brand = await service.createFeaturedBrand(input);
    revalidateShowcase("/admin/featured-brands");
    return brand;
  });
}

export async function updateFeaturedBrandAction(
  id: string,
  input: unknown,
): Promise<Result<FeaturedItemDto>> {
  return toResult(async () => {
    const brand = await service.updateFeaturedBrand(id, input);
    revalidateShowcase("/admin/featured-brands");
    return brand;
  });
}

export async function deleteFeaturedBrandAction(
  id: string,
): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteFeaturedBrand(id);
    revalidateShowcase("/admin/featured-brands");
    return { id };
  });
}

export async function reorderFeaturedBrandsAction(
  input: unknown,
): Promise<Result<{ ok: true }>> {
  return toResult(async () => {
    await service.reorderFeaturedBrands(input);
    revalidateShowcase("/admin/featured-brands");
    return { ok: true as const };
  });
}

export async function createFeaturedModelAction(
  input: unknown,
): Promise<Result<FeaturedItemDto>> {
  return toResult(async () => {
    const model = await service.createFeaturedModel(input);
    revalidateShowcase("/admin/featured-models");
    return model;
  });
}

export async function updateFeaturedModelAction(
  id: string,
  input: unknown,
): Promise<Result<FeaturedItemDto>> {
  return toResult(async () => {
    const model = await service.updateFeaturedModel(id, input);
    revalidateShowcase("/admin/featured-models");
    return model;
  });
}

export async function deleteFeaturedModelAction(
  id: string,
): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteFeaturedModel(id);
    revalidateShowcase("/admin/featured-models");
    return { id };
  });
}

export async function reorderFeaturedModelsAction(
  input: unknown,
): Promise<Result<{ ok: true }>> {
  return toResult(async () => {
    await service.reorderFeaturedModels(input);
    revalidateShowcase("/admin/featured-models");
    return { ok: true as const };
  });
}

export async function createMandebAction(input: unknown): Promise<Result<MandebDto>> {
  return toResult(async () => {
    const mandeb = await service.createMandeb(input);
    revalidatePath("/admin/mandebs");
    return mandeb;
  });
}

export async function updateMandebAction(
  id: string,
  input: unknown,
): Promise<Result<MandebDto>> {
  return toResult(async () => {
    const mandeb = await service.updateMandeb(id, input);
    revalidatePath("/admin/mandebs");
    return mandeb;
  });
}

export async function deleteMandebAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteMandeb(id);
    revalidatePath("/admin/mandebs");
    return { id };
  });
}
