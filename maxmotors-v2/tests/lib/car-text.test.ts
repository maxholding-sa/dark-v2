import { describe, it, expect } from "vitest";
import {
  normalizeCarText,
  carTextKey,
  carTextEquals,
  dedupeCarTexts,
} from "@/lib/car-text";

/**
 * These cases are the real dropdown bugs from v1, written down. Each one is a
 * spelling that produced a duplicate filter option in production.
 */
describe("normalizeCarText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCarText("  راف   فور  ")).toBe("راف فور");
  });

  it("strips zero-width and bidi marks pasted from spreadsheets", () => {
    expect(normalizeCarText("تويوتا‏")).toBe("تويوتا");
    expect(normalizeCarText("​كامري")).toBe("كامري");
  });

  it("removes tatweel", () => {
    expect(normalizeCarText("كامـــري")).toBe("كامري");
  });

  it("converts non-breaking spaces to ordinary ones", () => {
    expect(normalizeCarText("لاند كروزر")).toBe("لاند كروزر");
  });

  it("returns an empty string for null and undefined", () => {
    expect(normalizeCarText(null)).toBe("");
    expect(normalizeCarText(undefined)).toBe("");
  });
});

describe("carTextKey", () => {
  it("folds the alef forms", () => {
    expect(carTextKey("أوربان")).toBe(carTextKey("اوربان"));
  });

  it("folds alef maqsura to ya", () => {
    expect(carTextKey("كامرى")).toBe(carTextKey("كامري"));
  });

  it("folds ta marbuta to ha", () => {
    expect(carTextKey("سياره")).toBe(carTextKey("سيارة"));
  });

  it("is case-insensitive for latin text", () => {
    expect(carTextKey("Toyota")).toBe(carTextKey("toyota"));
  });

  it("does not merge genuinely different names", () => {
    expect(carTextKey("كامري")).not.toBe(carTextKey("كورولا"));
  });
});

describe("carTextEquals", () => {
  it("matches values differing only by a trailing space", () => {
    expect(carTextEquals("راف فور ", "راف فور")).toBe(true);
  });

  it("treats empty values as never equal", () => {
    expect(carTextEquals("", "")).toBe(false);
    expect(carTextEquals(null, undefined)).toBe(false);
  });
});

describe("dedupeCarTexts", () => {
  it("collapses spelling variants and keeps the first spelling seen", () => {
    const result = dedupeCarTexts(["تويوتا", " تويوتا ", "تويوتا‏", "هوندا"]);
    expect(result).toEqual(["تويوتا", "هوندا"]);
  });

  it("drops blank entries", () => {
    expect(dedupeCarTexts(["", "   ", null, "نيسان"])).toEqual(["نيسان"]);
  });
});
