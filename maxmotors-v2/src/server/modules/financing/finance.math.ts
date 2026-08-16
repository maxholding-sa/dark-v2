/**
 * The financing engine's arithmetic.
 *
 * Pure functions only — no database, no auth, no `server-only`. That is
 * deliberate: this is the code that decides what a customer is quoted, so it
 * has to be testable without any infrastructure at all. v1's equivalent was
 * verified by a throwaway script that had to be run by hand against production
 * data; here the same reference cases are unit tests that run on every push.
 *
 * Ported from v1 `src/lib/loan-calculator.js`. The formulas are unchanged; the
 * types, the guard clauses and the names are new.
 */

const EPSILON = 1e-10;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Accepts a rate as either a fraction (0.05) or a percentage (5).
 *
 * The database stores some rates as percentages and some as fractions, and the
 * admin form accepts either. Anything above 1 is read as a percentage — which
 * means a genuine 150% rate is unrepresentable, an acceptable trade for a
 * consumer auto-finance product.
 */
export function normalizeRate(value: unknown): number {
  const numeric = Number(value);
  if (value == null || !Number.isFinite(numeric)) return 0;

  return numeric > 1 ? numeric / 100 : numeric;
}

/**
 * Payment per period. Sign convention follows the spreadsheet PMT: a positive
 * present value returns a negative payment.
 */
export function pmt(rate: number, nper: number, pv: number, fv = 0): number {
  if (Math.abs(rate) < EPSILON) return -(pv + fv) / nper;

  const q = (1 + rate) ** nper;
  return (-rate * (pv * q + fv)) / (q - 1);
}

/** NPV of the loan equation: `pv*(1+r)^n + pmt*((1+r)^n - 1)/r + fv`. */
export function loanNpv(
  rate: number,
  nper: number,
  pv: number,
  payment: number,
  fv = 0,
): number {
  if (Math.abs(rate) < EPSILON) return pv + payment * nper + fv;

  const q = (1 + rate) ** nper;
  return pv * q + (payment * (q - 1)) / rate + fv;
}

/**
 * Solves for the periodic rate by bracketed bisection.
 *
 * Newton's method is faster but finds spurious roots once a balloon payment is
 * involved, because the NPV curve is no longer monotonic in the region of
 * interest. Bisection over a widening bracket trades speed — irrelevant at 200
 * iterations — for always returning the smallest non-negative root, which is
 * the economically meaningful one.
 *
 * Returns null when no sign change exists in [0, 10], i.e. no such rate.
 */
export function solveRate(
  nper: number,
  payment: number,
  pv: number,
  fv = 0,
  tolerance = 1e-10,
  maxIterations = 200,
): number | null {
  if (!Number.isFinite(nper) || nper <= 0) return null;
  if (!Number.isFinite(payment) || !Number.isFinite(pv) || !Number.isFinite(fv)) {
    return null;
  }

  let lo = 0;
  let fLo = loanNpv(lo, nper, pv, payment, fv);
  let hi = 0.01;
  let fHi = loanNpv(hi, nper, pv, payment, fv);

  // Widen until the interval brackets a root, or the rate becomes absurd.
  while (fLo * fHi > 0 && hi < 10) {
    hi = Math.min(hi * 2, 10);
    fHi = loanNpv(hi, nper, pv, payment, fv);
  }

  if (fLo * fHi > 0) return null;

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = loanNpv(mid, nper, pv, payment, fv);

    if (Math.abs(fMid) < tolerance || (hi - lo) / 2 < tolerance) return mid;

    if (fLo * fMid <= 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return (lo + hi) / 2;
}

export interface AprInput {
  termMonths: number;
  baseInstallment: number;
  financeAmount: number;
  adminFees: number;
  balloonPayment: number;
  rebate?: number;
}

/**
 * Annual percentage rate including administrative fees.
 *
 * This is the number a customer is legally shown, so it models what they
 * actually receive: the financed amount less fees taken up front, repaid by the
 * installment stream with the balloon as a final cashflow.
 */
export function computeAprIncludingFees({
  termMonths,
  baseInstallment,
  financeAmount,
  adminFees,
  balloonPayment,
  rebate = 0,
}: AprInput): number | null {
  const netFinanced = Math.max(
    0,
    Number(financeAmount) - Number(rebate) - Number(adminFees),
  );

  const monthlyRate = solveRate(
    termMonths,
    Number(baseInstallment),
    -netFinanced,
    Number(balloonPayment),
  );

  if (monthlyRate == null || !Number.isFinite(monthlyRate) || monthlyRate < 0) {
    return null;
  }

  // Effective annual rate, compounded monthly.
  return (1 + monthlyRate) ** 12 - 1;
}

export interface ScheduleRow {
  month: number;
  outstandingStart: number;
  profit: number;
  principal: number;
  outstandingEnd: number;
}

/**
 * Amortisation schedule before insurance is added.
 *
 * The balloon is repaid as extra principal in the final month, which is what
 * makes the closing balance land on zero rather than on the balloon amount.
 */
export function buildAmortisationSchedule(
  financeAmount: number,
  monthlyRate: number,
  termMonths: number,
  balloonPayment: number,
  monthlyInstallment: number,
): ScheduleRow[] {
  const schedule: ScheduleRow[] = [];
  let outstanding = financeAmount;

  for (let month = 1; month <= termMonths; month += 1) {
    const profit = outstanding * monthlyRate;
    let principal = monthlyInstallment - profit;

    if (month === termMonths) principal += balloonPayment;

    // Rounding drift can push the final principal a fraction past the balance.
    principal = clamp(principal, 0, outstanding);

    const outstandingEnd = Math.max(0, outstanding - principal);
    schedule.push({ month, outstandingStart: outstanding, profit, principal, outstandingEnd });

    outstanding = outstandingEnd;
  }

  return schedule;
}

export interface InsuranceResult {
  totalInsurance: number;
  annualPremiums: number[];
}

/**
 * Insurance premiums by policy year.
 *
 * Year 1 is floored at the bank's minimum premium; later years are not. The
 * asset depreciates each year, so a later premium legitimately falls below the
 * floor — applying it every year (which v1 kept as
 * `computeInsuranceFloorEveryYear` for regression comparison) overcharges on
 * long terms.
 */
export function computeInsurance(
  carPrice: number,
  insuranceRate: number,
  termMonths: number,
  minPremium: number,
  depreciationRate: number,
): InsuranceResult {
  const years = Math.ceil(termMonths / 12);
  const annualPremiums: number[] = [];

  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const assetValue = carPrice * (1 - depreciationRate) ** yearIndex;
    const rawPremium = assetValue * insuranceRate;

    annualPremiums.push(yearIndex === 0 ? Math.max(rawPremium, minPremium) : rawPremium);
  }

  const total = annualPremiums.reduce((sum, value) => sum + value, 0);

  // Round up: the bank must never collect less than the premiums it owes.
  return {
    totalInsurance: Math.ceil((total + Number.EPSILON) * 100) / 100,
    annualPremiums,
  };
}

/** Legacy model that floors every year. Retained only for regression tests. */
export function computeInsuranceFloorEveryYear(
  carPrice: number,
  insuranceRate: number,
  termMonths: number,
  minPremium: number,
  depreciationRate: number,
): InsuranceResult {
  const years = Math.ceil(termMonths / 12);
  const annualPremiums: number[] = [];

  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const assetValue = carPrice * (1 - depreciationRate) ** yearIndex;
    annualPremiums.push(Math.max(assetValue * insuranceRate, minPremium));
  }

  const total = annualPremiums.reduce((sum, value) => sum + value, 0);

  return {
    totalInsurance: Math.ceil((total + Number.EPSILON) * 100) / 100,
    annualPremiums,
  };
}

/**
 * Monthly funds-transfer-pricing curve, linearly interpolated between annual
 * anchors. Used to price the bank's own cost of funds across the term.
 */
export function interpolateFtpMonthly(
  anchors: readonly number[],
  termMonths: number,
): number[] {
  const normalized = (anchors.length > 0 ? anchors : [2.5]).map(normalizeRate);
  const lastIndex = normalized.length - 1;
  const result: number[] = [];

  for (let month = 1; month <= termMonths; month += 1) {
    const yearLower = Math.floor((month - 1) / 12);
    const yearUpper = Math.min(yearLower + 1, lastIndex);

    // Terms longer than the anchor list flatten at the last anchor.
    const lower = normalized[Math.min(yearLower, lastIndex)] ?? 0;
    const upper = normalized[yearUpper] ?? lower;
    const fraction = ((month - 1) % 12) / 12;

    result.push(lower + (upper - lower) * fraction);
  }

  return result;
}

/**
 * Reference cases with independently known answers.
 *
 * These are the contract for the APR solver: v1 shipped them as
 * `APR_VERIFICATION_CASES` and gated the customer-facing APR display on them
 * passing. They are now unit tests.
 */
export const APR_REFERENCE_CASES: (AprInput & { expectedAprPct: number })[] = [
  {
    termMonths: 60,
    baseInstallment: 669.25,
    financeAmount: 40000,
    adminFees: 400,
    balloonPayment: 5000,
    expectedAprPct: 4.879,
  },
  {
    termMonths: 60,
    baseInstallment: 686.241148,
    financeAmount: 51735.7,
    adminFees: 517,
    balloonPayment: 20345.5,
    expectedAprPct: 5.751,
  },
];

/** True when every reference case solves within `tolerancePct` percentage points. */
export function verifyAprSolver(tolerancePct = 0.02): boolean {
  return APR_REFERENCE_CASES.every((testCase) => {
    const apr = computeAprIncludingFees(testCase);
    if (apr == null) return false;

    return Math.abs(apr * 100 - testCase.expectedAprPct) <= tolerancePct;
  });
}
