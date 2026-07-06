import {
  InsuranceSegmentError,
  requireInsuranceSegment,
  resolveInsuranceSegmentFromMap,
} from "./brand-segment.js";

const EPSILON = 1e-10;

export { InsuranceSegmentError } from "./brand-segment.js";

const DEFAULT_AGE_BRACKETS = [
  "18 to 24",
  "25 to 30",
  "31 to 35",
  "36 to 40",
  "41 to 45",
  "46 to 50",
  "51 to 60",
  "61+",
];

const DEFAULT_SEGMENT_RATES = {
  male: {
    "18 to 24": { A: 0.0581, B: 0.0504, C: 0.0455, D: 0.043, E: 0.041, F: 0.04, G: 0.039 },
    "25 to 30": { A: 0.034, B: 0.0325, C: 0.031, D: 0.03, E: 0.029, F: 0.0285, G: 0.028 },
    "31 to 35": { A: 0.0252, B: 0.0245, C: 0.0266, D: 0.026, E: 0.0255, F: 0.025, G: 0.0245 },
    "36 to 40": { A: 0.0235, B: 0.023, C: 0.024, D: 0.0238, E: 0.0235, F: 0.0232, G: 0.023 },
    "41 to 45": { A: 0.024, B: 0.0237, C: 0.0243, D: 0.024, E: 0.0238, F: 0.0235, G: 0.0232 },
    "46 to 50": { A: 0.026, B: 0.0255, C: 0.0265, D: 0.026, E: 0.0258, F: 0.0255, G: 0.0252 },
    "51 to 60": { A: 0.03, B: 0.0295, C: 0.03, D: 0.0298, E: 0.0295, F: 0.0292, G: 0.029 },
    "61+": { A: 0.038, B: 0.037, C: 0.0375, D: 0.0372, E: 0.037, F: 0.0368, G: 0.0365 },
  },
  female: {
    "18 to 24": { A: 0.0441, B: 0.0469, C: 0.0588, D: 0.048, E: 0.046, F: 0.045, G: 0.044 },
    "25 to 30": { A: 0.031, B: 0.032, C: 0.034, D: 0.0335, E: 0.033, F: 0.0325, G: 0.032 },
    "31 to 35": { A: 0.028, B: 0.0294, C: 0.0336, D: 0.031, E: 0.03, F: 0.0295, G: 0.029 },
    "36 to 40": { A: 0.026, B: 0.027, C: 0.029, D: 0.0285, E: 0.028, F: 0.0275, G: 0.027 },
    "41 to 45": { A: 0.0265, B: 0.0275, C: 0.0295, D: 0.029, E: 0.0285, F: 0.028, G: 0.0278 },
    "46 to 50": { A: 0.0285, B: 0.0295, C: 0.0315, D: 0.031, E: 0.0305, F: 0.03, G: 0.0298 },
    "51 to 60": { A: 0.032, B: 0.033, C: 0.035, D: 0.0345, E: 0.034, F: 0.0335, G: 0.0332 },
    "61+": { A: 0.039, B: 0.04, C: 0.0415, D: 0.041, E: 0.0405, F: 0.04, G: 0.0395 },
  },
};

export const DEFAULT_INSURANCE_TABLE = DEFAULT_SEGMENT_RATES;

export const DEFAULT_BRAND_SEGMENT_MAP = {
  Toyota: "A",
  Lexus: "A",
  Hyundai: "B",
  Kia: "B",
  Nissan: "B",
  Jeep: "C",
  BMW: "D",
  Mercedes: "D",
  "Mercedes-Benz": "D",
  Chevrolet: "B",
  Ford: "B",
  Honda: "B",
  Suzuki: "B",
  Mitsubishi: "B",
  Genesis: "B",
  MG: "B",
  Geely: "B",
  Changan: "B",
  Jetour: "B",
  Chery: "B",
  BYD: "B",
  Skoda: "B",
  Renault: "B",
  Peugeot: "B",
  GAC: "B",
  Baic: "B",
  Foton: "B",
  JAC: "B",
  Haval: "B",
  Dongfeng: "B",
  Soueast: "B",
  Hongqi: "B",
  FAW: "B",
  Kaiyi: "B",
  Isuzu: "B",
  "Land Rover": "C",
  "Range Rover": "C",
  Ferrari: "D",
  Lamborghini: "D",
  "Rolls-Royce": "D",
  Porsche: "D",
  Volkswagen: "B",
  GMC: "C",
  Fiat: "B",
  ROX: "B",
};

export const DEFAULT_BANK_FINANCE_DEFAULTS = {
  adminFeesCap: 5000,
  defaultAdminFeesPct: 0.01,
  minInsurancePremium: 1650,
  assetDepreciationRate: 0.15,
  ftpAnchors: [2.45, 2.7, 2.75, 2.78, 2.8, 2.46],
  cor: 0.0108,
  opex: 0.0048,
  irrTarget: 0.0621,
  brandSegmentMap: DEFAULT_BRAND_SEGMENT_MAP,
  insuranceTable: DEFAULT_SEGMENT_RATES,
};

export const DEFAULT_BANK_CONFIG = {
  admin_fees_cap: DEFAULT_BANK_FINANCE_DEFAULTS.adminFeesCap,
  min_insurance_premium: DEFAULT_BANK_FINANCE_DEFAULTS.minInsurancePremium,
  asset_depreciation_rate: DEFAULT_BANK_FINANCE_DEFAULTS.assetDepreciationRate,
  min_term_months: 12,
  max_term_months: 60,
  default_admin_fees_pct: DEFAULT_BANK_FINANCE_DEFAULTS.defaultAdminFeesPct,
  ftp_anchors: DEFAULT_BANK_FINANCE_DEFAULTS.ftpAnchors,
  cor: DEFAULT_BANK_FINANCE_DEFAULTS.cor,
  opex: DEFAULT_BANK_FINANCE_DEFAULTS.opex,
  irr_target: DEFAULT_BANK_FINANCE_DEFAULTS.irrTarget,
  brand_segment_map: DEFAULT_BRAND_SEGMENT_MAP,
  insurance_table: DEFAULT_SEGMENT_RATES,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const normalizeRate = (value) => {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const numeric = Number(value);
  return numeric > 1 ? numeric / 100 : numeric;
};

const getInsuranceRate = (table, gender, ageBracket, segment) => {
  const normalizedGender = gender === "female" ? "female" : "male";
  const ageTable = table?.[normalizedGender]?.[ageBracket] || table?.[normalizedGender]?.["31 to 35"];
  return ageTable?.[segment] ?? ageTable?.A ?? 0.025;
};

export function pmt(rate, nper, pv, fv = 0) {
  if (Math.abs(rate) < EPSILON) return -(pv + fv) / nper;
  const q = (1 + rate) ** nper;
  return (-rate * (pv * q + fv)) / (q - 1);
}

/** NPV for standard loan equation: pv*(1+r)^n + pmt*((1+r)^n-1)/r + fv = 0 */
export function loanNpv(rate, nper, pv, pmt, fv = 0) {
  if (Math.abs(rate) < EPSILON) return pv + pmt * nper + fv;
  const q = (1 + rate) ** nper;
  return pv * q + (pmt * (q - 1)) / rate + fv;
}

/**
 * Bracketed bisection RATE solver — avoids spurious roots with balloon payments.
 * Returns the smallest non-negative monthly rate in the bracket, or null if none.
 */
export function rate(nper, pmt, pv, fv = 0, tol = 1e-10, maxIter = 200) {
  if (!Number.isFinite(nper) || nper <= 0) return null;
  if (!Number.isFinite(pmt) || !Number.isFinite(pv) || !Number.isFinite(fv)) return null;

  let lo = 0;
  let fLo = loanNpv(lo, nper, pv, pmt, fv);
  let hi = 0.01;
  let fHi = loanNpv(hi, nper, pv, pmt, fv);

  while (fLo * fHi > 0 && hi < 10) {
    hi = Math.min(hi * 2, 10);
    fHi = loanNpv(hi, nper, pv, pmt, fv);
  }

  if (fLo * fHi > 0) return null;

  for (let i = 0; i < maxIter; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = loanNpv(mid, nper, pv, pmt, fv);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) return mid;
    if (fLo * fMid <= 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return (lo + hi) / 2;
}

/** Reference cases for APR (inc. fees) — must pass before customer APR is shown. */
export const APR_VERIFICATION_CASES = [
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

export function computeAprIncludingFees({
  termMonths,
  baseInstallment,
  financeAmount,
  adminFees,
  balloonPayment,
  rebate = 0,
}) {
  const netFinanced = Math.max(0, Number(financeAmount) - Number(rebate) - Number(adminFees));
  const pv = -netFinanced;
  const monthlyRate = rate(
    termMonths,
    Number(baseInstallment),
    pv,
    Number(balloonPayment)
  );
  if (monthlyRate == null || !Number.isFinite(monthlyRate) || monthlyRate < 0) return null;
  return (1 + monthlyRate) ** 12 - 1;
}

export function verifyAprSolver(tolerancePct = 0.02) {
  return verifyAprReferenceCases(tolerancePct);
}

export function verifyAprReferenceCases(tolerancePct = 0.02) {
  return APR_VERIFICATION_CASES.every((testCase) => {
    const apr = computeAprIncludingFees(testCase);
    if (apr == null) return false;
    const aprPct = apr * 100;
    return Math.abs(aprPct - testCase.expectedAprPct) <= tolerancePct;
  });
}

/** Representative banks used when DB is unavailable (CI / offline). */
export const APR_REGRESSION_FIXTURE_BANKS = [
  {
    id: "regression-3.9",
    name: "Regression 3.9%",
    interestRate: 3.9,
    adminFeesCap: 5000,
    defaultAdminFeesPct: 0.01,
  },
  {
    id: "regression-4.5",
    name: "Regression 4.5%",
    interestRate: 4.5,
    adminFeesCap: 5000,
    defaultAdminFeesPct: 0.01,
  },
  {
    id: "regression-5.0",
    name: "Regression 5.0%",
    interestRate: 5.0,
    adminFeesCap: 5000,
    defaultAdminFeesPct: 0.015,
  },
];

const DEFAULT_REGRESSION_CAR = {
  carPrice: 278000,
  carBrand: "Toyota",
  gender: "male",
  ageBracket: "31 to 35",
};

/** Upper APR bound: nominal profit + upfront admin fee impact (stronger on short terms). */
function maxExpectedAprIncludingFees(nominalProfit, adminFees, financeAmount, termMonths) {
  const netFinanced = Math.max(0, Number(financeAmount) - Number(adminFees));
  const effectiveAdminRate = netFinanced > 0 ? Number(adminFees) / netFinanced : 0;
  const termFactor = 12 / Math.max(1, Number(termMonths));
  const buffer = 0.005;
  return nominalProfit + effectiveAdminRate + effectiveAdminRate * termFactor + buffer;
}

/**
 * Runs the offer grid (terms × down × balloon) for each bank and asserts APR/IRR sanity.
 */
export function runAprRegressionForBanks(
  banks,
  {
    carPrice = DEFAULT_REGRESSION_CAR.carPrice,
    carBrand = DEFAULT_REGRESSION_CAR.carBrand,
    gender = DEFAULT_REGRESSION_CAR.gender,
    ageBracket = DEFAULT_REGRESSION_CAR.ageBracket,
    maxFailures = 20,
  } = {}
) {
  const failures = [];
  const normalizedBanks = Array.isArray(banks) ? banks : [];

  for (const bank of normalizedBanks) {
    const bankConfig = createBankConfigFromBank(bank);
    const profitRate = Number(bank?.interestRate ?? 4.5);
    const adminPct = bankConfig.default_admin_fees_pct ?? 0.01;

    for (const termMonths of LOAN_CALCULATOR_META.financingTerms) {
      for (const downPct of LOAN_CALCULATOR_META.downPaymentOptions) {
        for (const balloonPct of LOAN_CALCULATOR_META.balloonOptions) {
          const insuranceSegment = resolveInsuranceSegmentFromMap(
            DEFAULT_BRAND_SEGMENT_MAP,
            carBrand,
            { mapLabel: "default brand category table (regression)" }
          );

          const result = calculateIslamicAutoFinance(bankConfig, {
            car_price: carPrice,
            down_payment_pct: downPct,
            term_months: termMonths,
            profit_rate: profitRate,
            admin_fees_pct: adminPct,
            balloon_payment_pct: balloonPct,
            gender,
            age_bracket: ageBracket,
            insurance_segment: insuranceSegment,
            rebate: 0,
          });

          const apr = result.metrics.apr_including_fees;
          const irr = result.metrics.irr;
          const nominalProfit = result.inputs.profit_rate;
          const adminFees = result.derived.admin_fees;
          const financeAmount = result.derived.finance_amount;
          const maxApr = maxExpectedAprIncludingFees(
            nominalProfit,
            adminFees,
            financeAmount,
            termMonths
          );

          const context = {
            bankId: bank.id,
            bankName: bank.name,
            termMonths,
            downPct,
            balloonPct,
            profitRatePct: round(nominalProfit * 100, 4),
            aprPct: apr != null ? round(apr * 100, 4) : null,
            irrPct: irr != null ? round(irr * 100, 4) : null,
            maxAprPct: round(maxApr * 100, 4),
          };

          if (nominalProfit > 0) {
            if (apr == null || !Number.isFinite(apr) || apr <= 0) {
              failures.push({ ...context, reason: "APR must be positive when profit rate is positive" });
            } else if (apr < nominalProfit - 1e-6) {
              failures.push({
                ...context,
                reason: "APR below nominal profit rate (fees should not reduce effective rate below profit)",
              });
            } else if (apr > maxApr) {
              failures.push({
                ...context,
                reason: "APR exceeds profit rate plus expected admin-fee impact",
              });
            }

            if (irr == null || !Number.isFinite(irr) || irr <= 0) {
              failures.push({ ...context, reason: "IRR must be positive when profit rate is positive" });
            }
          }

          if (failures.length >= maxFailures) {
            return { pass: false, failures, truncated: true };
          }
        }
      }
    }
  }

  return { pass: failures.length === 0, failures, truncated: false };
}

let registeredDisclosureBanks = null;
let registeredBankKey = null;
let regressionCache = null;

export function registerAprDisclosureBanks(banks) {
  const key = (banks || [])
    .map((b) => b.id)
    .sort()
    .join("|");
  if (key === registeredBankKey) return;
  registeredDisclosureBanks = banks || [];
  registeredBankKey = key;
  regressionCache = null;
}

export function resetAprDisclosureCache() {
  registeredDisclosureBanks = null;
  registeredBankKey = null;
  regressionCache = null;
  aprSolverVerifiedCache = null;
}

/** Live APR disclosure: solver reference cases must pass (full regression runs in CI via verify:apr). */
export function isAprDisclosureEnabled() {
  if (!verifyAprReferenceCases()) {
    if (typeof console !== "undefined") {
      console.error(
        "[financing] APR reference cases failed — customer APR is disabled."
      );
    }
    return false;
  }
  return true;
}

let aprSolverVerifiedCache = null;
export function isAprSolverVerified() {
  return isAprDisclosureEnabled();
}

function buildBaseSchedule(financeAmount, monthlyRate, termMonths, balloonPayment, monthlyInstallment) {
  const schedule = [];
  let outstanding = financeAmount;
  for (let month = 1; month <= termMonths; month += 1) {
    const profit = outstanding * monthlyRate;
    let principal = monthlyInstallment - profit;
    if (month === termMonths) {
      principal += balloonPayment;
    }
    principal = clamp(principal, 0, outstanding);
    const nextOutstanding = Math.max(0, outstanding - principal);
    schedule.push({
      month,
      outstandingStart: outstanding,
      profit,
      principal,
      outstandingEnd: nextOutstanding,
    });
    outstanding = nextOutstanding;
  }
  return schedule;
}

/**
 * Insurance premiums by policy year.
 * Year 1 only: max(carPrice × rate, minPremium).
 * Years 2+: (carPrice × (1 − depreciation)^(N−1)) × rate — no floor clamp.
 */
export function computeInsurance(
  carPrice,
  insuranceRate,
  termMonths,
  minPremium,
  depreciationRate = DEFAULT_BANK_CONFIG.asset_depreciation_rate
) {
  const years = Math.ceil(termMonths / 12);
  const annualPremiums = [];
  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const assetValue = carPrice * (1 - depreciationRate) ** yearIndex;
    const rawPremium = assetValue * insuranceRate;
    const annualPremium = yearIndex === 0 ? Math.max(rawPremium, minPremium) : rawPremium;
    annualPremiums.push(annualPremium);
  }
  const totalInsurance =
    Math.ceil((annualPremiums.reduce((sum, value) => sum + value, 0) + Number.EPSILON) * 100) / 100;
  return { totalInsurance, annualPremiums };
}

/** Legacy model (floor every year) — used only in regression tests. */
export function computeInsuranceFloorEveryYear(
  carPrice,
  insuranceRate,
  termMonths,
  minPremium,
  depreciationRate = DEFAULT_BANK_CONFIG.asset_depreciation_rate
) {
  const years = Math.ceil(termMonths / 12);
  const annualPremiums = [];
  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const assetValue = carPrice * (1 - depreciationRate) ** yearIndex;
    annualPremiums.push(Math.max(assetValue * insuranceRate, minPremium));
  }
  const totalInsurance =
    Math.ceil((annualPremiums.reduce((sum, value) => sum + value, 0) + Number.EPSILON) * 100) / 100;
  return { totalInsurance, annualPremiums };
}

export const INSURANCE_REGRESSION_FIXTURE_BANKS = [
  {
    id: "insurance-regression-default",
    name: "Insurance default floor",
    minInsurancePremium: 1650,
    assetDepreciationRate: 0.15,
  },
  {
    id: "insurance-regression-high-floor",
    name: "Insurance high floor",
    minInsurancePremium: 3000,
    assetDepreciationRate: 0.15,
  },
  {
    id: "insurance-regression-low-dep",
    name: "Insurance low depreciation",
    minInsurancePremium: 1650,
    assetDepreciationRate: 0.1,
  },
  {
    id: "insurance-regression-high-dep",
    name: "Insurance high depreciation",
    minInsurancePremium: 2000,
    assetDepreciationRate: 0.2,
  },
];

const INSURANCE_REGRESSION_CAR_PRICES = [80_000, 150_000, 278_000, 600_000];
const INSURANCE_REGRESSION_RATES = [0.0245, 0.026, 0.034];
const INSURANCE_REGRESSION_TERMS = [12, 24, 36, 48, 60];

/**
 * Asserts year-1-only floor: total ≤ legacy floor-every-year total;
 * years 2+ never clamped when raw premium is below the floor.
 */
export function runInsurancePremiumRegression(
  banks = INSURANCE_REGRESSION_FIXTURE_BANKS,
  {
    carPrices = INSURANCE_REGRESSION_CAR_PRICES,
    insuranceRates = INSURANCE_REGRESSION_RATES,
    terms = INSURANCE_REGRESSION_TERMS,
    maxFailures = 25,
  } = {}
) {
  const failures = [];
  const normalizedBanks = Array.isArray(banks) ? banks : [];

  for (const bank of normalizedBanks) {
    const bankConfig = createBankConfigFromBank(bank);
    const minPremium = Number(bankConfig.min_insurance_premium ?? 0);
    const depreciationRate = Number(bankConfig.asset_depreciation_rate ?? 0.15);

    for (const carPrice of carPrices) {
      for (const insuranceRate of insuranceRates) {
        for (const termMonths of terms) {
          const current = computeInsurance(
            carPrice,
            insuranceRate,
            termMonths,
            minPremium,
            depreciationRate
          );
          const legacy = computeInsuranceFloorEveryYear(
            carPrice,
            insuranceRate,
            termMonths,
            minPremium,
            depreciationRate
          );

          const context = {
            bankId: bank.id,
            bankName: bank.name,
            carPrice,
            insuranceRate,
            termMonths,
            minPremium,
            depreciationRate,
            currentTotal: current.totalInsurance,
            legacyTotal: legacy.totalInsurance,
            annualPremiums: current.annualPremiums,
          };

          if (current.totalInsurance > legacy.totalInsurance + 1e-6) {
            failures.push({
              ...context,
              reason: "current total exceeds legacy floor-every-year total",
            });
          }

          for (let yearIndex = 1; yearIndex < current.annualPremiums.length; yearIndex += 1) {
            const assetValue = carPrice * (1 - depreciationRate) ** yearIndex;
            const rawPremium = assetValue * insuranceRate;
            const premium = current.annualPremiums[yearIndex];
            if (rawPremium < minPremium - 1e-6 && Math.abs(premium - minPremium) < 1e-6) {
              failures.push({
                ...context,
                yearIndex: yearIndex + 1,
                rawPremium: round(rawPremium, 4),
                premium: round(premium, 4),
                reason: "year 2+ silently clamped to floor",
              });
            }
            if (Math.abs(premium - rawPremium) > 0.02) {
              failures.push({
                ...context,
                yearIndex: yearIndex + 1,
                rawPremium: round(rawPremium, 4),
                premium: round(premium, 4),
                reason: "year 2+ premium does not match raw depreciated premium",
              });
            }
          }

          if (failures.length >= maxFailures) {
            return { pass: false, failures, truncated: true };
          }
        }
      }
    }
  }

  return { pass: failures.length === 0, failures, truncated: false };
}

function interpolateFtpMonthly(anchors, termMonths) {
  const normalizedAnchors = (anchors?.length ? anchors : [2.5]).map(normalizeRate);
  const lastIndex = normalizedAnchors.length - 1;
  const result = [];
  for (let month = 1; month <= termMonths; month += 1) {
    const yearLower = Math.floor((month - 1) / 12);
    const yearUpper = Math.min(yearLower + 1, lastIndex);
    const lower = normalizedAnchors[Math.min(yearLower, lastIndex)];
    const upper = normalizedAnchors[yearUpper];
    const fraction = ((month - 1) % 12) / 12;
    result.push(lower + (upper - lower) * fraction);
  }
  return result;
}

const parseOptionalNumber = (value, fallback) => {
  if (value == null || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const parseJsonObject = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export function createBankConfigFromBank(bank, overrides = {}) {
  const brandSegmentMap = {
    ...DEFAULT_BRAND_SEGMENT_MAP,
    ...parseJsonObject(bank?.brandSegmentMap, {}),
    ...(overrides?.brand_segment_map || {}),
  };
  const insuranceTable = parseJsonObject(bank?.insuranceTable, DEFAULT_INSURANCE_TABLE);
  const ftpAnchorsRaw = parseJsonObject(bank?.ftpAnchors, DEFAULT_BANK_CONFIG.ftp_anchors);
  const ftpAnchors = Array.isArray(ftpAnchorsRaw) && ftpAnchorsRaw.length
    ? ftpAnchorsRaw.map(Number)
    : DEFAULT_BANK_CONFIG.ftp_anchors;

  return {
    ...DEFAULT_BANK_CONFIG,
    ...overrides,
    bank_id: bank?.id || "default_bank",
    admin_fees_cap: parseOptionalNumber(bank?.adminFeesCap, DEFAULT_BANK_CONFIG.admin_fees_cap),
    default_admin_fees_pct: normalizeRate(
      parseOptionalNumber(bank?.defaultAdminFeesPct, DEFAULT_BANK_CONFIG.default_admin_fees_pct)
    ),
    min_insurance_premium: parseOptionalNumber(
      bank?.minInsurancePremium,
      DEFAULT_BANK_CONFIG.min_insurance_premium
    ),
    asset_depreciation_rate: parseOptionalNumber(
      bank?.assetDepreciationRate,
      DEFAULT_BANK_CONFIG.asset_depreciation_rate
    ),
    cor: parseOptionalNumber(bank?.cor, DEFAULT_BANK_CONFIG.cor),
    opex: parseOptionalNumber(bank?.opex, DEFAULT_BANK_CONFIG.opex),
    irr_target: parseOptionalNumber(bank?.irrTarget, DEFAULT_BANK_CONFIG.irr_target),
    ftp_anchors: ftpAnchors,
    insurance_table: insuranceTable,
    brand_segment_map: brandSegmentMap,
  };
}

export function calculateIslamicAutoFinance(bankConfigInput, inputs) {
  const bankConfig = { ...DEFAULT_BANK_CONFIG, ...(bankConfigInput || {}) };
  const minTerm = Number(bankConfig.min_term_months || 12);
  const maxTerm = Number(bankConfig.max_term_months || 60);
  const term = clamp(Math.round(Number(inputs.term_months || minTerm)), minTerm, maxTerm);
  const profitRate = normalizeRate(inputs.profit_rate);
  const downPct = normalizeRate(inputs.down_payment_pct);
  const adminPct = normalizeRate(inputs.admin_fees_pct);
  const balloonPct = normalizeRate(inputs.balloon_payment_pct);
  const rebate = Number(inputs.rebate || 0);

  const carPrice = Number(inputs.car_price || 0);
  const downPayment = carPrice * downPct;
  const financeAmount = Math.max(0, carPrice - downPayment);
  const balloonPayment = carPrice * balloonPct;
  const adminFees = Math.round(Math.min(Number(bankConfig.admin_fees_cap || 0), financeAmount * adminPct));

  const monthlyRate = profitRate / 12;
  const monthlyInstallment = pmt(monthlyRate, term, -financeAmount, balloonPayment);

  const segment = requireInsuranceSegment(inputs.insurance_segment);
  const insuranceRate = getInsuranceRate(bankConfig.insurance_table, inputs.gender, inputs.age_bracket, segment);

  const baseSchedule = buildBaseSchedule(financeAmount, monthlyRate, term, balloonPayment, monthlyInstallment);
  const { totalInsurance, annualPremiums } = computeInsurance(
    carPrice,
    insuranceRate,
    term,
    Number(bankConfig.min_insurance_premium || 0),
    Number(bankConfig.asset_depreciation_rate ?? DEFAULT_BANK_CONFIG.asset_depreciation_rate)
  );
  const monthlyInsurance = totalInsurance / term;
  const totalMonthlyPayment = monthlyInstallment + monthlyInsurance;

  const schedule = baseSchedule.map((row) => {
    const insurance = monthlyInsurance;
    const cashflow = row.principal + row.profit + insurance;
    return { ...row, insurance, cashflow };
  });

  const totalCashflow = schedule.reduce((sum, row) => sum + row.cashflow, 0);
  const ftpMonthly = interpolateFtpMonthly(bankConfig.ftp_anchors, term);
  const weightedFtp = schedule.reduce((sum, row, idx) => {
    const weight = totalCashflow > 0 ? row.cashflow / totalCashflow : 0;
    return sum + weight * (ftpMonthly[idx] || 0);
  }, 0);

  const lastScheduleRow = schedule[schedule.length - 1];
  const lastMonthPayment = lastScheduleRow
    ? lastScheduleRow.cashflow
    : totalMonthlyPayment;

  const totalProfit = schedule.reduce((sum, row) => sum + row.profit, 0);
  const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
  const flatProfitRate = financeAmount > 0 ? (totalProfit / financeAmount / term) * 12 : 0;
  const totalCostPct = profitRate + insuranceRate;
  const grandTotal = totalPrincipal + totalInsurance + totalProfit + adminFees;

  // Customer APR (inc. fees): PV=-(finance-admin), PMT=base installment, FV=balloon
  const aprIncludingFees = computeAprIncludingFees({
    termMonths: term,
    baseInstallment: monthlyInstallment,
    financeAmount,
    adminFees,
    balloonPayment,
    rebate,
  });
  const monthlyRoiRate =
    aprIncludingFees != null
      ? (1 + aprIncludingFees) ** (1 / 12) - 1
      : null;
  const irr = monthlyRoiRate != null ? monthlyRoiRate * 12 : null;

  const breakeven = weightedFtp + Number(bankConfig.cor || 0) + Number(bankConfig.opex || 0);
  const netMargin = aprIncludingFees != null ? aprIncludingFees - breakeven : null;
  const netProfit = netMargin != null ? netMargin * financeAmount : null;
  const irrGap =
    irr != null ? Number(bankConfig.irr_target || 0) - irr : null;

  return {
    inputs: {
      car_price: carPrice,
      term_months: term,
      profit_rate: profitRate,
      down_payment_pct: downPct,
      admin_fees_pct: adminPct,
      balloon_payment_pct: balloonPct,
      rebate,
      gender: inputs.gender || "male",
      age_bracket: inputs.age_bracket || "31 to 35",
      car_brand: inputs.car_brand || "",
    },
    derived: {
      down_payment_sar: round(downPayment, 2),
      finance_amount: round(financeAmount, 2),
      balloon_payment: round(balloonPayment, 2),
      last_month_payment: round(lastMonthPayment, 2),
      admin_fees: round(adminFees, 2),
      insurance_rate: insuranceRate,
      segment,
      annual_premiums: annualPremiums.map((v) => round(v, 2)),
    },
    totals: {
      installment: round(monthlyInstallment, 2),
      monthly_insurance: round(monthlyInsurance, 2),
      total_monthly_payment: round(totalMonthlyPayment, 2),
      total_insurance: round(totalInsurance, 2),
      total_profit: round(totalProfit, 2),
      total_principal: round(totalPrincipal, 2),
      grand_total: round(grandTotal, 2),
      flat_profit_rate: flatProfitRate,
      total_cost_pct: totalCostPct,
    },
    metrics: {
      weighted_ftp: weightedFtp,
      breakeven,
      apr: aprIncludingFees,
      apr_including_fees: aprIncludingFees,
      irr,
      net_margin: netMargin,
      net_profit: netProfit != null ? round(netProfit, 2) : null,
      irr_gap: irrGap,
    },
    schedule: schedule.map((row) => ({
      month: row.month,
      outstanding_start: round(row.outstandingStart, 2),
      profit: round(row.profit, 2),
      principal: round(row.principal, 2),
      insurance: round(row.insurance, 2),
      cashflow: round(row.cashflow, 2),
      outstanding_end: round(row.outstandingEnd, 2),
    })),
  };
}

export const LOAN_CALCULATOR_META = {
  ageBrackets: DEFAULT_AGE_BRACKETS,
  genders: [
    { value: "male", label: "ذكر" },
    { value: "female", label: "أنثى" },
  ],
  financingTerms: [60],
  maxDownPaymentPct: 0.45,
  downPaymentOptions: [0.1, 0.2, 0.3, 0.4, 0.45],
  balloonOptions: [0, 0.1, 0.2],
};

/** Customer-facing offer fields (excludes bank-internal profitability metrics). */
export function buildCustomerFinancingOffer(bankConfig, inputs, meta = {}, options = {}) {
  let result;
  try {
    result = calculateIslamicAutoFinance(bankConfig, inputs);
  } catch (error) {
    if (error instanceof InsuranceSegmentError) {
      return {
        ...meta,
        needsManualReview: true,
        manualReviewReason: error.message,
        pricingAvailable: false,
        insuranceSegment: null,
      };
    }
    throw error;
  }

  const aprDecimal = result.metrics.apr_including_fees;
  const disclosureEnabled = isAprDisclosureEnabled();
  const aprValid =
    disclosureEnabled &&
    aprDecimal != null &&
    Number.isFinite(aprDecimal) &&
    aprDecimal >= 0;

  if (!disclosureEnabled) {
    console.warn(
      `[financing] APR hidden for offer ${meta.id ?? "?"} — solver reference verification not passed.`
    );
  } else if (!aprValid) {
    console.warn(
      `[financing] APR (inc. fees) could not be computed for offer ${meta.id ?? "?"} (bank: ${meta.bankName ?? "unknown"})`
    );
  }

  const profitRateAnnual = round(result.inputs.profit_rate * 100, 2);

  return {
    ...meta,
    needsManualReview: false,
    pricingAvailable: true,
    downPayment: result.derived.down_payment_sar,
    downPaymentPct: result.inputs.down_payment_pct * 100,
    monthlyPayment: result.totals.total_monthly_payment,
    baseInstallment: result.totals.installment,
    monthlyInsurance: result.totals.monthly_insurance,
    termMonths: result.inputs.term_months,
    interestRate: profitRateAnnual,
    profitRateAnnual,
    apr: aprValid ? round(aprDecimal * 100, 2) : null,
    aprAvailable: aprValid,
    adminFees: result.derived.admin_fees,
    balloonPayment: result.derived.balloon_payment,
    balloonPaymentPct: result.inputs.balloon_payment_pct * 100,
    finalPayment: result.derived.last_month_payment,
    lastMonthPayment: result.derived.last_month_payment,
    totalPayment: result.totals.grand_total,
    totalProfit: result.totals.total_profit,
    totalInsurance: result.totals.total_insurance,
    flatProfitRate: result.totals.flat_profit_rate,
    insuranceSegment: result.derived.segment,
  };
}

export function formatFinancingRateDisclosure(offer) {
  const profitPct = Number(offer?.profitRateAnnual ?? offer?.interestRate ?? 0).toFixed(2);
  if (offer?.aprAvailable && offer.apr != null) {
    return `نسبة الربح السنوية: ${profitPct}%   |   النسبة الفعلية (APR): ${Number(offer.apr).toFixed(2)}%`;
  }
  return `نسبة الربح السنوية: ${profitPct}%`;
}
