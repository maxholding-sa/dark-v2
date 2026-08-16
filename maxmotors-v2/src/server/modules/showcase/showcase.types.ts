import type { FeaturedBrand, FeaturedModel, Mandeb } from "@prisma/client";

export interface FeaturedItemDto {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  order: number;
  isActive: boolean;
}

export interface MandebDto {
  id: string;
  name: string;
  phone: string;
  city: string;
}

export function toFeaturedBrandDto(brand: FeaturedBrand): FeaturedItemDto {
  return {
    id: brand.id,
    name: brand.name,
    nameAr: brand.nameAr,
    image: brand.image,
    order: brand.order,
    isActive: brand.isActive,
  };
}

export function toFeaturedModelDto(model: FeaturedModel): FeaturedItemDto {
  return {
    id: model.id,
    name: model.name,
    nameAr: model.nameAr,
    image: model.image,
    order: model.order,
    isActive: model.isActive,
  };
}

export function toMandebDto(mandeb: Mandeb): MandebDto {
  return {
    id: mandeb.id,
    name: mandeb.name,
    phone: mandeb.phone,
    city: mandeb.city,
  };
}
