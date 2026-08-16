import { describe, it, expect } from "vitest";
import { paginate, toSkipTake } from "@/lib/pagination";

describe("toSkipTake", () => {
  it("maps page 1 to a zero offset", () => {
    expect(toSkipTake({ page: 1, limit: 12 })).toEqual({ skip: 0, take: 12 });
  });

  it("offsets by whole pages", () => {
    expect(toSkipTake({ page: 3, limit: 12 })).toEqual({ skip: 24, take: 12 });
  });

  it("never produces a negative offset", () => {
    expect(toSkipTake({ page: 0, limit: 10 }).skip).toBe(0);
  });
});

describe("paginate", () => {
  it("rounds a partial last page up", () => {
    const result = paginate([], 25, { page: 1, limit: 12 });
    expect(result.totalPages).toBe(3);
  });

  it("reports no pages when there are no results", () => {
    const result = paginate([], 0, { page: 1, limit: 12 });
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
  });

  it("flags neighbours correctly in the middle of a set", () => {
    const result = paginate([], 100, { page: 5, limit: 10 });
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
  });

  it("has no next page on the last page", () => {
    const result = paginate([], 20, { page: 2, limit: 10 });
    expect(result.hasNext).toBe(false);
  });
});
