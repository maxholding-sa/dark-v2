import { describe, it, expect } from "vitest";
import { carInputSchema, parseCarQuery } from "@/server/modules/cars/car.schema";

const validCar = {
  make: "  تويوتا  ",
  model: "كامري",
  year: 2024,
  price: 120000,
  mileage: 15000,
  color: "أبيض",
  fuelType: "بنزين",
  transmission: "أوتوماتيك",
  bodyType: "سيدان",
  description: "سيارة بحالة ممتازة وفحص كامل ومضمونة",
  images: ["https://example.com/a.jpg"],
};

describe("carInputSchema", () => {
  it("accepts a valid car and normalises its text fields", () => {
    const parsed = carInputSchema.parse(validCar);
    expect(parsed.make).toBe("تويوتا");
  });

  it("applies the documented defaults", () => {
    const parsed = carInputSchema.parse(validCar);
    expect(parsed.status).toBe("AVAILABLE");
    expect(parsed.testDriveAvailable).toBe(true);
    expect(parsed.featured).toBe(false);
  });

  it("rejects a zero or negative price", () => {
    expect(carInputSchema.safeParse({ ...validCar, price: 0 }).success).toBe(false);
    expect(carInputSchema.safeParse({ ...validCar, price: -1 }).success).toBe(false);
  });

  it("rejects a car with no images", () => {
    const result = carInputSchema.safeParse({ ...validCar, images: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a make that is only whitespace", () => {
    expect(carInputSchema.safeParse({ ...validCar, make: "   " }).success).toBe(false);
  });

  it("allows next year's models but not implausible years", () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(carInputSchema.safeParse({ ...validCar, year: nextYear }).success).toBe(true);
    expect(carInputSchema.safeParse({ ...validCar, year: 1890 }).success).toBe(false);
    expect(carInputSchema.safeParse({ ...validCar, year: 2200 }).success).toBe(false);
  });

  it("rejects a malformed video URL", () => {
    expect(
      carInputSchema.safeParse({ ...validCar, videoUrl: "not-a-url" }).success,
    ).toBe(false);
  });

  it("reports the offending field so a form can highlight it", () => {
    const result = carInputSchema.safeParse({ ...validCar, price: -5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["price"]);
    }
  });
});

describe("parseCarQuery", () => {
  it("supplies defaults for an empty query", () => {
    const query = parseCarQuery({});
    expect(query.page).toBe(1);
    expect(query.sortBy).toBe("newest");
    expect(query.search).toBe("");
  });

  it("coerces the string values a URL always produces", () => {
    const query = parseCarQuery({ page: "3", minPrice: "50000", limit: "24" });
    expect(query.page).toBe(3);
    expect(query.minPrice).toBe(50000);
    expect(query.limit).toBe(24);
  });

  it("swaps a reversed price range instead of returning nothing", () => {
    const query = parseCarQuery({ minPrice: "200000", maxPrice: "50000" });
    expect(query.minPrice).toBe(50000);
    expect(query.maxPrice).toBe(200000);
  });

  it("falls back to defaults for a hand-edited URL rather than throwing", () => {
    const query = parseCarQuery({ sortBy: "nonsense", page: "-4" });
    expect(query.sortBy).toBe("newest");
    expect(query.page).toBe(1);
  });

  it("clamps an oversized limit so a crawler cannot request the whole table", () => {
    const query = parseCarQuery({ limit: "5000" });
    expect(query.limit).toBeLessThanOrEqual(60);
  });
});
