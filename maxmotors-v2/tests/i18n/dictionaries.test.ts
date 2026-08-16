import { describe, it, expect } from "vitest";
import { ar } from "@/i18n/dictionaries/ar";
import { en } from "@/i18n/dictionaries/en";
import { translate, createTranslator } from "@/i18n";
import type { Translations } from "@/i18n/types";

/** Flattens a nested dictionary into dot-paths, for comparing key sets. */
function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionaries", () => {
  it("define exactly the same keys", () => {
    // TypeScript already enforces this at build time; the test catches a
    // regression if anyone ever widens the Translations type.
    expect(flatten(en).sort()).toEqual(flatten(ar).sort());
  });

  it("has no empty translations", () => {
    const empties = flatten(en).filter(
      (key) => translate(en, key) === "" || translate(ar as unknown as Translations, key) === "",
    );
    expect(empties).toEqual([]);
  });
});

describe("translate", () => {
  it("resolves a nested key", () => {
    expect(translate(en, "cars.filters.title")).toBe("Filter results");
  });

  it("substitutes named placeholders", () => {
    expect(translate(en, "cars.resultsCount", { count: 12 })).toBe("12 cars");
  });

  it("leaves an unknown placeholder untouched rather than printing undefined", () => {
    expect(translate(en, "cars.resultsCount", {})).toBe("{count} cars");
  });

  it("returns the key itself when it is missing, never undefined", () => {
    expect(translate(en, "does.not.exist")).toBe("does.not.exist");
  });

  it("does not crash on a path that runs through a string", () => {
    expect(translate(en, "common.save.deeper")).toBe("common.save.deeper");
  });
});

describe("createTranslator", () => {
  it("defaults to Arabic", () => {
    expect(createTranslator()("common.save")).toBe("حفظ");
  });

  it("returns English when asked", () => {
    expect(createTranslator("en")("common.save")).toBe("Save");
  });
});
