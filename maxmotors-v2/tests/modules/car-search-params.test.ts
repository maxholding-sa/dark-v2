import { describe, it, expect } from "vitest";
import { parseCarQuery } from "@/server/modules/cars/car.schema";
import { buildCarsHref, activeFilters } from "@/features/cars/lib/car-search-params";

describe("buildCarsHref", () => {
  it("omits default values so a shared link stays readable", () => {
    expect(buildCarsHref(parseCarQuery({}))).toBe("/cars");
  });

  it("keeps the filters that are actually set", () => {
    const href = buildCarsHref(parseCarQuery({ make: "تويوتا" }));
    expect(href).toContain("make=");
    expect(href).not.toContain("page=");
  });

  it("resets to page 1 when a filter changes", () => {
    const query = parseCarQuery({ page: "5", make: "تويوتا" });
    const href = buildCarsHref(query, { bodyType: "سيدان" });
    expect(href).not.toContain("page=");
  });

  it("keeps the filters when only the page changes", () => {
    const query = parseCarQuery({ make: "تويوتا" });
    const href = buildCarsHref(query, { page: "3" });
    expect(href).toContain("page=3");
    expect(href).toContain("make=");
  });

  it("drops a filter that is cleared to an empty value", () => {
    const query = parseCarQuery({ make: "تويوتا", bodyType: "سيدان" });
    const href = buildCarsHref(query, { make: "" });
    expect(href).not.toContain("make=");
    expect(href).toContain("bodyType=");
  });

  it("targets an alternate base path for the admin table", () => {
    const href = buildCarsHref(parseCarQuery({}), { page: "2" }, "/admin/cars");
    expect(href).toBe("/admin/cars?page=2");
  });
});

describe("activeFilters", () => {
  it("lists nothing for a default query", () => {
    expect(activeFilters(parseCarQuery({}))).toEqual([]);
  });

  it("lists each set filter once", () => {
    const chips = activeFilters(parseCarQuery({ make: "تويوتا", color: "أبيض" }));
    expect(chips.map((chip) => chip.key)).toEqual(["make", "color"]);
  });
});
