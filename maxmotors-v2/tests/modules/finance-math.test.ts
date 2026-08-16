import { describe, it, expect } from "vitest";
import {
  pmt,
  loanNpv,
  solveRate,
  computeAprIncludingFees,
  computeInsurance,
  computeInsuranceFloorEveryYear,
  buildAmortisationSchedule,
  interpolateFtpMonthly,
  normalizeRate,
  verifyAprSolver,
  APR_REFERENCE_CASES,
} from "@/server/modules/financing/finance.math";

/**
 * The money math. v1 had no tests for any of this — only
 * `scripts/verify-apr-solver.mjs`, which had to be run by hand against the
 * production database.
 *
 * The APR reference cases below are v1's own `APR_VERIFICATION_CASES`, which it
 * used to gate whether a customer-facing APR could be displayed at all. They
 * are the contract.
 */

describe("normalizeRate", () => {
  it("passes a fraction through unchanged", () => {
    expect(normalizeRate(0.05)).toBeCloseTo(0.05, 10);
  });

  it("converts a percentage above 1 into a fraction", () => {
    expect(normalizeRate(5)).toBeCloseTo(0.05, 10);
  });

  it("treats exactly 1 as a fraction, not 1%", () => {
    expect(normalizeRate(1)).toBe(1);
  });

  it("returns 0 for null, undefined and non-numeric input", () => {
    expect(normalizeRate(null)).toBe(0);
    expect(normalizeRate(undefined)).toBe(0);
    expect(normalizeRate("abc")).toBe(0);
  });
});

describe("pmt", () => {
  it("matches the spreadsheet PMT for a plain amortising loan", () => {
    // 100,000 over 60 months at 6% nominal (0.5%/month) = 1,933.28
    expect(pmt(0.005, 60, 100_000)).toBeCloseTo(-1933.28, 2);
  });

  it("divides evenly at a zero rate", () => {
    expect(pmt(0, 12, 12_000)).toBeCloseTo(-1000, 10);
  });

  it("reduces the payment when a balloon is present", () => {
    const withoutBalloon = Math.abs(pmt(0.005, 60, -100_000, 0));
    const withBalloon = Math.abs(pmt(0.005, 60, -100_000, 20_000));

    expect(withBalloon).toBeLessThan(withoutBalloon);
  });
});

describe("loanNpv", () => {
  it("is zero at the rate that PMT was derived from", () => {
    const payment = pmt(0.005, 60, -100_000, 0);
    expect(loanNpv(0.005, 60, -100_000, payment, 0)).toBeCloseTo(0, 6);
  });

  it("handles a zero rate without dividing by zero", () => {
    expect(loanNpv(0, 12, -12_000, 1000, 0)).toBeCloseTo(0, 10);
  });
});

describe("solveRate", () => {
  it("recovers the rate that produced a payment", () => {
    const payment = pmt(0.005, 60, -100_000, 0);
    expect(solveRate(60, payment, -100_000, 0)).toBeCloseTo(0.005, 8);
  });

  it("recovers the rate when a balloon payment is present", () => {
    const payment = pmt(0.004, 48, -80_000, 15_000);
    expect(solveRate(48, payment, -80_000, 15_000)).toBeCloseTo(0.004, 8);
  });

  it("returns null when no non-negative rate can satisfy the equation", () => {
    // Repaying less than was borrowed implies a negative rate.
    expect(solveRate(12, 10, -100_000, 0)).toBeNull();
  });

  it("returns null for a nonsensical term", () => {
    expect(solveRate(0, -100, -1000)).toBeNull();
    expect(solveRate(-5, -100, -1000)).toBeNull();
  });

  it("returns null when an input is not finite", () => {
    expect(solveRate(60, Number.NaN, -1000)).toBeNull();
    expect(solveRate(60, -100, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("finds a zero rate when principal equals total repayments", () => {
    expect(solveRate(10, 100, -1000, 0)).toBeCloseTo(0, 8);
  });
});

describe("computeAprIncludingFees", () => {
  // These two cases are the reason the APR solver uses bisection rather than
  // Newton's method — both carry a balloon.
  it.each(APR_REFERENCE_CASES)(
    "matches the reference APR for term=$termMonths balloon=$balloonPayment",
    (testCase) => {
      const apr = computeAprIncludingFees(testCase);

      expect(apr).not.toBeNull();
      expect((apr as number) * 100).toBeCloseTo(testCase.expectedAprPct, 2);
    },
  );

  it("passes its own verification gate", () => {
    expect(verifyAprSolver()).toBe(true);
  });

  it("reports a higher APR once admin fees are charged", () => {
    const base = {
      termMonths: 60,
      baseInstallment: 669.25,
      financeAmount: 40_000,
      balloonPayment: 5000,
    };

    const withoutFees = computeAprIncludingFees({ ...base, adminFees: 0 });
    const withFees = computeAprIncludingFees({ ...base, adminFees: 400 });

    expect(withFees).toBeGreaterThan(withoutFees as number);
  });

  it("treats a rebate as reducing the amount financed", () => {
    const base = {
      termMonths: 60,
      baseInstallment: 669.25,
      financeAmount: 40_000,
      adminFees: 400,
      balloonPayment: 5000,
    };

    const withRebate = computeAprIncludingFees({ ...base, rebate: 2000 });

    expect(withRebate).toBeGreaterThan(computeAprIncludingFees(base) as number);
  });

  it("returns null rather than a negative APR when the maths has no solution", () => {
    const apr = computeAprIncludingFees({
      termMonths: 60,
      baseInstallment: 1,
      financeAmount: 100_000,
      adminFees: 0,
      balloonPayment: 0,
    });

    expect(apr).toBeNull();
  });
});

describe("computeInsurance", () => {
  const RATE = 0.025;
  const DEPRECIATION = 0.15;

  it("floors only the first year at the minimum premium", () => {
    // 80,000 x 2.5% = 2,000 in year 1, above the 1,650 floor.
    // Year 2 asset = 68,000 -> 1,700; year 3 = 57,800 -> 1,445, below the floor
    // and deliberately not raised to it.
    const { annualPremiums } = computeInsurance(80_000, RATE, 36, 1650, DEPRECIATION);

    expect(annualPremiums).toHaveLength(3);
    expect(annualPremiums[0]).toBeCloseTo(2000, 2);
    expect(annualPremiums[1]).toBeCloseTo(1700, 2);
    expect(annualPremiums[2]).toBeCloseTo(1445, 2);
  });

  it("raises a cheap first year to the floor", () => {
    // 40,000 x 2.5% = 1,000, below the 1,650 floor.
    const { annualPremiums } = computeInsurance(40_000, RATE, 12, 1650, DEPRECIATION);

    expect(annualPremiums[0]).toBeCloseTo(1650, 2);
  });

  it("counts a part year as a whole policy year", () => {
    const { annualPremiums } = computeInsurance(80_000, RATE, 13, 1650, DEPRECIATION);
    expect(annualPremiums).toHaveLength(2);
  });

  it("rounds the total up, never down", () => {
    const { totalInsurance, annualPremiums } = computeInsurance(
      77_777,
      0.0233,
      24,
      1650,
      DEPRECIATION,
    );

    const exact = annualPremiums.reduce((sum, value) => sum + value, 0);
    expect(totalInsurance).toBeGreaterThanOrEqual(exact - 1e-9);
  });

  it("differs from the legacy floor-every-year model on long terms", () => {
    const current = computeInsurance(80_000, RATE, 60, 1650, DEPRECIATION);
    const legacy = computeInsuranceFloorEveryYear(80_000, RATE, 60, 1650, DEPRECIATION);

    // The legacy model overcharges once depreciation takes premiums below the
    // floor, which is exactly why it was replaced.
    expect(legacy.totalInsurance).toBeGreaterThan(current.totalInsurance);
  });
});

describe("buildAmortisationSchedule", () => {
  it("pays the balance down to zero", () => {
    const installment = Math.abs(pmt(0.005, 60, -100_000, 0));
    const schedule = buildAmortisationSchedule(100_000, 0.005, 60, 0, installment);

    expect(schedule).toHaveLength(60);
    expect(schedule.at(-1)?.outstandingEnd).toBeCloseTo(0, 2);
  });

  it("clears the balloon in the final month", () => {
    const installment = Math.abs(pmt(0.005, 60, -100_000, 20_000));
    const schedule = buildAmortisationSchedule(100_000, 0.005, 60, 20_000, installment);

    const last = schedule.at(-1);
    expect(last?.outstandingEnd).toBeCloseTo(0, 2);
    // The final month repays the balloon on top of a normal principal slice.
    expect(last?.principal).toBeGreaterThan(20_000);
  });

  it("charges profit on the opening balance each month", () => {
    const schedule = buildAmortisationSchedule(100_000, 0.005, 12, 0, 8600);
    expect(schedule[0]?.profit).toBeCloseTo(500, 6);
  });

  it("never lets the outstanding balance go negative", () => {
    // A deliberately oversized installment would overshoot without the clamp.
    const schedule = buildAmortisationSchedule(10_000, 0.005, 12, 0, 5000);
    expect(schedule.every((row) => row.outstandingEnd >= 0)).toBe(true);
  });
});

describe("interpolateFtpMonthly", () => {
  it("returns one rate per month", () => {
    expect(interpolateFtpMonthly([2.45, 2.7], 24)).toHaveLength(24);
  });

  it("starts exactly on the first anchor", () => {
    expect(interpolateFtpMonthly([2.4, 3.6], 24)[0]).toBeCloseTo(0.024, 10);
  });

  it("interpolates linearly between anchors", () => {
    // Month 7 is halfway through year 1: midway between 2.4% and 3.6%.
    expect(interpolateFtpMonthly([2.4, 3.6], 24)[6]).toBeCloseTo(0.03, 10);
  });

  it("flattens at the last anchor for terms beyond the curve", () => {
    const monthly = interpolateFtpMonthly([2.4, 3.6], 60);
    expect(monthly.at(-1)).toBeCloseTo(0.036, 10);
  });

  it("falls back to a default anchor when given none", () => {
    expect(interpolateFtpMonthly([], 12).every((rate) => rate === 0.025)).toBe(true);
  });
});
