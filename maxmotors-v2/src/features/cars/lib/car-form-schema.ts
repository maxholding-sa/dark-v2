import { z } from "zod";

/**
 * Client-side form schema.
 *
 * Separate from the server's `carInputSchema` on purpose, and deliberately
 * *string-typed* for the numeric fields.
 *
 * An `<input type="number">` hands back a string, and an empty one hands back
 * `""`. Using `z.coerce.number()` here would make the schema's input type
 * `unknown` while its output stayed `number`, which `zodResolver` cannot
 * reconcile with `useForm<CarFormValues>` — and `valueAsNumber` turns an empty
 * field into `NaN`, which then fails a `min()` check with an error about the
 * wrong thing. Keeping the form in strings and converting once, in
 * `toCarPayload`, avoids both.
 *
 * None of this weakens validation: the server re-validates every payload with
 * `carInputSchema`, which is the authoritative check. This copy exists to give
 * the user an error before a round trip.
 */

/** A required numeric text field, validated without changing its type. */
const numericField = (
  { min, max, message }: { min: number; max?: number; message: string },
) =>
  z
    .string()
    .trim()
    .min(1, "validation.required")
    .refine((value) => Number.isFinite(Number(value)), "validation.invalidNumber")
    .refine((value) => Number(value) >= min, message)
    .refine((value) => max === undefined || Number(value) <= max, message);

/** An optional numeric text field — empty is allowed and means "not recorded". */
const optionalNumericField = ({ min, max }: { min: number; max: number }) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max),
      "validation.invalidNumber",
    );

const MAX_YEAR = new Date().getFullYear() + 2;

export const carFormSchema = z.object({
  make: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  model: z.string().trim().min(1, "validation.required").max(60, "validation.tooLong"),
  year: numericField({ min: 1950, max: MAX_YEAR, message: "validation.yearRange" }),
  price: numericField({ min: 1, message: "validation.priceMin" }),
  mileage: numericField({ min: 0, max: 2_000_000, message: "validation.invalidNumber" }),
  color: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  fuelType: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  transmission: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(40, "validation.tooLong"),
  bodyType: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  description: z
    .string()
    .trim()
    .min(10, "validation.tooShort")
    .max(8000, "validation.tooLong"),

  category: z.string().trim().max(60, "validation.tooLong"),
  driveType: z.string().trim().max(40, "validation.tooLong"),
  seats: optionalNumericField({ min: 1, max: 60 }),
  videoUrl: z.union([z.literal(""), z.string().url("validation.invalidUrl")]),

  isLuxury: z.boolean(),
  isEconomic: z.boolean(),
  isCommercial: z.boolean(),
  featured: z.boolean(),
  testDriveAvailable: z.boolean(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),

  images: z.array(z.string().url()).min(1, "validation.imagesRequired"),
});

export type CarFormValues = z.infer<typeof carFormSchema>;

/** Fields the form treats as numeric text — used to pick the right input type. */
export const NUMERIC_FIELDS = ["year", "price", "mileage", "seats"] as const;

export const emptyCarForm: CarFormValues = {
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  price: "",
  mileage: "0",
  color: "",
  fuelType: "",
  transmission: "",
  bodyType: "",
  description: "",
  category: "",
  driveType: "",
  seats: "",
  videoUrl: "",
  isLuxury: false,
  isEconomic: false,
  isCommercial: false,
  featured: false,
  testDriveAvailable: true,
  status: "AVAILABLE",
  images: [],
};

/** Fills the form from an existing car, stringifying the numeric fields. */
export function toCarFormValues(car: {
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  description: string;
  category: string | null;
  driveType: string | null;
  seats: number | null;
  videoUrl: string | null;
  isLuxury: boolean;
  isEconomic: boolean;
  isCommercial: boolean;
  featured: boolean;
  testDriveAvailable: boolean;
  status: CarFormValues["status"];
  images: string[];
}): CarFormValues {
  return {
    make: car.make,
    model: car.model,
    year: String(car.year),
    price: String(car.price),
    mileage: String(car.mileage),
    color: car.color,
    fuelType: car.fuelType,
    transmission: car.transmission,
    bodyType: car.bodyType,
    description: car.description,
    category: car.category ?? "",
    driveType: car.driveType ?? "",
    seats: car.seats !== null ? String(car.seats) : "",
    videoUrl: car.videoUrl ?? "",
    isLuxury: car.isLuxury,
    isEconomic: car.isEconomic,
    isCommercial: car.isCommercial,
    featured: car.featured,
    testDriveAvailable: car.testDriveAvailable,
    status: car.status,
    images: car.images,
  };
}

/** Converts the form's strings into the shape `carInputSchema` expects. */
export function toCarPayload(values: CarFormValues) {
  return {
    make: values.make,
    model: values.model,
    year: Number(values.year),
    price: Number(values.price),
    mileage: Number(values.mileage),
    color: values.color,
    fuelType: values.fuelType,
    transmission: values.transmission,
    bodyType: values.bodyType,
    description: values.description,
    category: values.category || null,
    driveType: values.driveType || null,
    seats: values.seats ? Number(values.seats) : null,
    videoUrl: values.videoUrl || null,
    isLuxury: values.isLuxury,
    isEconomic: values.isEconomic,
    isCommercial: values.isCommercial,
    featured: values.featured,
    testDriveAvailable: values.testDriveAvailable,
    status: values.status,
    images: values.images,
  };
}
