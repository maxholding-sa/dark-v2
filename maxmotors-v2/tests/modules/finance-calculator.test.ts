import { describe, it, expect } from "vitest";
import {
  calculateFinance,
  createBankConfig,
  lookupInsuranceRate,
  type FinanceInputs,
} from "@/server/modules/financing/finance.calculator";
import {
  resolveSegmentFromMap,
  resolveSegmentForBrand,
  normalizeBrandKey,
  buildBrandSegmentLookup,
  parseBrandSegmentMap,
  isBrandMapped,
  BrandSegmentNotFoundError,
} from "@/server/modules/financing/brand-segment";
import {
  DEFAULT_INSURANCE_TABLE,
  DEFAULT_BRAND_SEGMENT_MAP,
} from "@/server/modules/financing/finance.constants";

const baseInputs: FinanceInputs = {
  carPrice: 100_000,
  termMonths: 60,
  profitRate: 0.05,
  downPaymentPct: 0.2,
  adminFeesPct: 0.01,
  balloonPaymentPct: 0,
  insuranceSegment: "A",
  gender: "male",
  ageBracket: "31 to 35",
};

describe("calculateFinance", () => {
  it("derives the down payment and financed amount from the car price", () => {
    const { customer } = calculateFinance({}, baseInputs);

    expect(customer.downPayment).toBeCloseTo(20_000, 2);
    expect(customer.financeAmount).toBeCloseTo(80_000, 2);
  });

  it("caps admin fees at the bank's ceiling", () => {
    const { customer } = calculateFinance(
      { adminFeesCap: 500 },
      { ...baseInputs, adminFeesPct: 0.05 },
    );

    expect(customer.adminFees).toBe(500);
  });

  it("charges the uncapped percentage when it is below the cap", () => {
    const { customer } = calculateFinance({ adminFeesCap: 5000 }, baseInputs);

    // 1% of 80,000 financed.
    expect(customer.adminFees).toBe(800);
  });

  it("clamps the term into the bank's allowed range", () => {
    expect(
      calculateFinance({ maxTermMonths: 60 }, { ...baseInputs, termMonths: 120 }).customer
        .termMonths,
    ).toBe(60);

    expect(
      calculateFinance({ minTermMonths: 12 }, { ...baseInputs, termMonths: 3 }).customer
        .termMonths,
    ).toBe(12);
  });

  it("accepts a profit rate given as a percentage", () => {
    const asFraction = calculateFinance({}, { ...baseInputs, profitRate: 0.05 });
    const asPercent = calculateFinance({}, { ...baseInputs, profitRate: 5 });

    expect(asPercent.customer.baseInstallment).toBeCloseTo(
      asFraction.customer.baseInstallment,
      6,
    );
  });

  it("produces one schedule row per month, ending at a zero balance", () => {
    const { schedule } = calculateFinance({}, baseInputs);

    expect(schedule).toHaveLength(60);
    expect(schedule.at(-1)?.outstandingEnd).toBeCloseTo(0, 1);
  });

  it("lowers the monthly payment when a balloon is taken", () => {
    const without = calculateFinance({}, baseInputs);
    const withBalloon = calculateFinance({}, { ...baseInputs, balloonPaymentPct: 0.2 });

    expect(withBalloon.customer.baseInstallment).toBeLessThan(
      without.customer.baseInstallment,
    );
    expect(withBalloon.customer.balloonPayment).toBeCloseTo(20_000, 2);
  });

  it("makes the final month larger when a balloon is due", () => {
    const { customer } = calculateFinance({}, { ...baseInputs, balloonPaymentPct: 0.2 });
    expect(customer.lastMonthPayment).toBeGreaterThan(customer.monthlyPayment);
  });

  it("adds levelised insurance on top of the base installment", () => {
    const { customer } = calculateFinance({}, baseInputs);

    expect(customer.monthlyPayment).toBeCloseTo(
      customer.baseInstallment + customer.monthlyInsurance,
      2,
    );
  });

  it("returns a grand total covering principal, profit, insurance and fees", () => {
    const { customer } = calculateFinance({}, baseInputs);

    expect(customer.grandTotal).toBeCloseTo(
      customer.totalPrincipal +
        customer.totalProfit +
        customer.totalInsurance +
        customer.adminFees,
      1,
    );
  });

  it("computes an APR above the headline profit rate once fees are added", () => {
    const { customer } = calculateFinance({}, baseInputs);

    expect(customer.aprIncludingFees).not.toBeNull();
    expect(customer.aprIncludingFees as number).toBeGreaterThan(customer.profitRate);
  });

  it("keeps bank-internal metrics out of the customer object", () => {
    const result = calculateFinance({}, baseInputs);

    expect(Object.keys(result.customer)).not.toContain("netProfit");
    expect(Object.keys(result.customer)).not.toContain("breakeven");
    expect(result.internal.netProfit).not.toBeNull();
  });

  it("rejects a zero or negative car price rather than dividing by it", () => {
    expect(() => calculateFinance({}, { ...baseInputs, carPrice: 0 })).toThrow();
    expect(() => calculateFinance({}, { ...baseInputs, carPrice: -5000 })).toThrow();
  });

  it("quotes a higher premium for a younger driver", () => {
    const young = calculateFinance({}, { ...baseInputs, ageBracket: "18 to 24" });
    const older = calculateFinance({}, { ...baseInputs, ageBracket: "36 to 40" });

    expect(young.customer.totalInsurance).toBeGreaterThan(older.customer.totalInsurance);
  });

  it("charges a higher premium for a riskier vehicle segment", () => {
    const segmentA = calculateFinance({}, { ...baseInputs, insuranceSegment: "A" });
    const segmentD = calculateFinance({}, { ...baseInputs, insuranceSegment: "D" });

    expect(segmentD.customer.insuranceRate).toBeGreaterThan(
      segmentA.customer.insuranceRate,
    );
  });
});

describe("createBankConfig", () => {
  it("fills in every default", () => {
    const config = createBankConfig();

    expect(config.adminFeesCap).toBe(5000);
    expect(config.minInsurancePremium).toBe(1650);
    expect(config.ftpAnchors.length).toBeGreaterThan(0);
  });

  it("lets an override win over the default", () => {
    expect(createBankConfig({ adminFeesCap: 999 }).adminFeesCap).toBe(999);
  });
});

describe("lookupInsuranceRate", () => {
  it("returns the exact cell when one exists", () => {
    expect(lookupInsuranceRate(DEFAULT_INSURANCE_TABLE, "male", "31 to 35", "A")).toBe(
      0.0252,
    );
  });

  it("quotes female drivers from the female table", () => {
    expect(lookupInsuranceRate(DEFAULT_INSURANCE_TABLE, "female", "31 to 35", "A")).toBe(
      0.028,
    );
  });

  it("falls back to segment A when the segment is missing from a bank table", () => {
    const sparse = { male: { "31 to 35": { A: 0.03 } } };
    expect(lookupInsuranceRate(sparse, "male", "31 to 35", "G")).toBe(0.03);
  });

  it("falls back to a last-resort rate when the table is empty", () => {
    expect(lookupInsuranceRate({}, "male", "31 to 35", "A")).toBe(0.025);
  });
});

describe("brand segment resolution", () => {
  it("normalises spacing and case", () => {
    expect(normalizeBrandKey("  Land   Rover ")).toBe("land rover");
  });

  it("resolves a canonical English brand", () => {
    expect(resolveSegmentForBrand("Toyota")).toBe("A");
    expect(resolveSegmentForBrand("BMW")).toBe("D");
  });

  it("resolves an Arabic brand name through the alias table", () => {
    expect(resolveSegmentForBrand("تويوتا")).toBe("A");
    expect(resolveSegmentForBrand("مرسيدس")).toBe("D");
    expect(resolveSegmentForBrand("لكزس")).toBe("A");
  });

  it("is case-insensitive", () => {
    expect(resolveSegmentForBrand("toyota")).toBe("A");
  });

  it("throws for an unknown brand rather than defaulting to the cheapest band", () => {
    // The whole point: a silent default would under-quote an unrecognised
    // luxury brand.
    expect(() => resolveSegmentForBrand("Bugatti")).toThrow(BrandSegmentNotFoundError);
  });

  it("throws for an empty brand", () => {
    expect(() => resolveSegmentForBrand("")).toThrow(BrandSegmentNotFoundError);
    expect(() => resolveSegmentForBrand(null)).toThrow(BrandSegmentNotFoundError);
  });

  it("does not grant a brand through an alias when the bank omits it", () => {
    const bankMap = { Toyota: "B" };

    expect(resolveSegmentFromMap(bankMap, "تويوتا")).toBe("B");
    // Mercedes is aliased but absent from this bank's map.
    expect(() => resolveSegmentFromMap(bankMap, "مرسيدس")).toThrow();
  });

  it("lets a bank map override the default segment", () => {
    expect(resolveSegmentFromMap({ Toyota: "C" }, "Toyota")).toBe("C");
  });

  it("rejects a segment outside A–G", () => {
    expect(() => resolveSegmentFromMap({ Toyota: "Z" }, "Toyota")).toThrow();
  });
});

describe("parseBrandSegmentMap", () => {
  it("returns the object unchanged", () => {
    expect(parseBrandSegmentMap({ Toyota: "A" })).toEqual({ Toyota: "A" });
  });

  it("parses a JSON string", () => {
    expect(parseBrandSegmentMap('{"Toyota":"B"}')).toEqual({ Toyota: "B" });
  });

  it("falls back on malformed JSON rather than throwing", () => {
    expect(parseBrandSegmentMap("{not json", { Kia: "B" })).toEqual({ Kia: "B" });
  });

  it("falls back on null and empty input", () => {
    expect(parseBrandSegmentMap(null)).toEqual(DEFAULT_BRAND_SEGMENT_MAP);
    expect(parseBrandSegmentMap("")).toEqual(DEFAULT_BRAND_SEGMENT_MAP);
  });

  it("rejects an array, which is not a segment map", () => {
    expect(parseBrandSegmentMap(["Toyota"], { Kia: "B" })).toEqual({ Kia: "B" });
  });
});

describe("buildBrandSegmentLookup / isBrandMapped", () => {
  it("uppercases segment values", () => {
    expect(buildBrandSegmentLookup({ Toyota: "a" }).get("toyota")).toBe("A");
  });

  it("reports membership for aliases of mapped brands", () => {
    expect(isBrandMapped(DEFAULT_BRAND_SEGMENT_MAP, "تويوتا")).toBe(true);
    expect(isBrandMapped(DEFAULT_BRAND_SEGMENT_MAP, "Bugatti")).toBe(false);
  });

  it("returns an empty lookup for a non-object map", () => {
    expect(buildBrandSegmentLookup(null).size).toBe(0);
  });
});
