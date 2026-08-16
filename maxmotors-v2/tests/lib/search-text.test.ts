import { describe, it, expect } from "vitest";
import {
  normalizeSearchText,
  buildSpellingVariants,
  tokenizeQuery,
  escapeLikePattern,
} from "@/lib/search-text";

describe("normalizeSearchText", () => {
  it("folds alef, ya and ta marbuta", () => {
    expect(normalizeSearchText("أحمد")).toBe("احمد");
    expect(normalizeSearchText("كامرى")).toBe("كامري");
    expect(normalizeSearchText("سيارة")).toBe("سياره");
  });

  it("strips diacritics and tatweel", () => {
    expect(normalizeSearchText("كَامْري")).toBe("كامري");
    expect(normalizeSearchText("كامـري")).toBe("كامري");
  });

  it("converts Arabic-Indic digits to western ones", () => {
    expect(normalizeSearchText("٢٠٢٤")).toBe("2024");
  });

  it("lowercases latin text and collapses whitespace", () => {
    expect(normalizeSearchText("  Toyota   Camry ")).toBe("toyota camry");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeSearchText("")).toBe("");
    expect(normalizeSearchText(null)).toBe("");
  });
});

describe("buildSpellingVariants", () => {
  it("includes the normalised form and the original term", () => {
    const variants = buildSpellingVariants("كامرى");
    expect(variants).toContain("كامري");
    expect(variants).toContain("كامرى");
  });

  it("offers the alef-hamza spelling so unnormalised rows still match", () => {
    expect(buildSpellingVariants("احمد")).toContain("أحمد");
  });

  it("returns nothing for a blank term", () => {
    expect(buildSpellingVariants("   ")).toEqual([]);
  });

  it("never returns an empty string, which would match every row", () => {
    expect(buildSpellingVariants("تويوتا").every((v) => v.length > 0)).toBe(true);
  });
});

describe("tokenizeQuery", () => {
  it("splits into terms", () => {
    expect(tokenizeQuery("تويوتا كامري")).toEqual(["تويوتا", "كامري"]);
  });

  it("drops noise words that would match everything", () => {
    expect(tokenizeQuery("سيارات تويوتا")).toEqual(["تويوتا"]);
  });

  it("drops single characters", () => {
    expect(tokenizeQuery("a تويوتا")).toEqual(["تويوتا"]);
  });
});

describe("escapeLikePattern", () => {
  it("escapes the SQL wildcards so a literal query cannot become one", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });
});
