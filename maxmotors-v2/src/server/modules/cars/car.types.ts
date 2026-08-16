import type { Car } from "@prisma/client";

/**
 * The car shape the UI receives.
 *
 * A Prisma `Car` cannot cross the server/client boundary: `price` is a
 * `Decimal` instance and the dates are `Date` objects, neither of which
 * survives React's serialisation. v1 handled this with a `serializedCarsData`
 * helper that callers had to remember — and several forgot, producing the
 * "Only plain objects can be passed to Client Components" error at runtime.
 *
 * Here the DTO is a distinct type, so forgetting to map is a compile error.
 */
export interface CarDto {
  id: string;
  make: string;
  model: string;
  year: number;
  /** Plain number, already converted from Prisma's Decimal. */
  price: number;
  mileage: number;
  color: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  driveType: string | null;
  seats: number | null;
  category: string | null;
  description: string;
  videoUrl: string | null;
  insuranceSegment: string | null;
  status: Car["status"];
  featured: boolean;
  testDriveAvailable: boolean;
  isLuxury: boolean;
  isEconomic: boolean;
  isCommercial: boolean;
  images: string[];
  /** ISO 8601 strings, not Date objects. */
  createdAt: string;
  updatedAt: string;
}

/** A car plus whether the current viewer has saved it. */
export interface CarWithSavedState extends CarDto {
  isSaved: boolean;
}

/** Distinct values present in the inventory, for building filter dropdowns. */
export interface CarFilterOptions {
  makes: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  transmissions: string[];
  colors: string[];
  priceRange: { min: number; max: number };
}

/** Maps a Prisma row to the client-safe DTO. The only place that conversion happens. */
export function toCarDto(car: Car): CarDto {
  return {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    price: Number(car.price),
    mileage: car.mileage,
    color: car.color,
    fuelType: car.fuelType,
    transmission: car.transmission,
    bodyType: car.bodyType,
    driveType: car.driveType,
    seats: car.seats,
    category: car.category,
    description: car.description,
    videoUrl: car.videoUrl,
    insuranceSegment: car.insuranceSegment,
    status: car.status,
    featured: car.featured,
    testDriveAvailable: car.testDriveAvailable,
    isLuxury: car.isLuxury,
    isEconomic: car.isEconomic,
    isCommercial: car.isCommercial,
    images: car.images,
    createdAt: car.createdAt.toISOString(),
    updatedAt: car.updatedAt.toISOString(),
  };
}

export function toCarDtos(cars: Car[]): CarDto[] {
  return cars.map(toCarDto);
}
