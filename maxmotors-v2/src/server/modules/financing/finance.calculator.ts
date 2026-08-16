import {
  DEFAULT_BANK_FINANCE,
  DEFAULT_INSURANCE_TABLE,
  DEFAULT_BRAND_SEGMENT_MAP,
  DEFAULT_AGE_BRACKET,
  type AgeBracket,
  type Gender,
  type InsuranceSegment,
  type InsuranceTable,
} from "./finance.constants";
import {
  pmt,
  clamp,
  round,
  normalizeRate,
  computeInsurance,
  buildAmortisationSchedule,
  interpolateFtpMonthly,
  computeAprIncludingFees,
} from "./finance.math";
import { validateInsuranceSegment } from "./brand-segment";
import { AppError } from "@/server/errors/app-error";

/**
 * The Islamic auto-finance calculation.
 *
 * Ported from v1 `calculateIslamicAutoFinance`. The output is split into
 * `customer` and `internal`: the customer half is everything a buyer may see,
 * the internal half is the bank's profitability model (funding cost, margin,
 * IRR gap). v1 returned one flat object and relied on each caller to remember
 * not to serialise the bank's margin to the browser.
 */

export interface BankConfig {
  bankId: string;
  adminFeesCap: number;
  defaultAdminFeesPct: number;
  minInsurancePremium: number;
  assetDepreciationRate: number;
  minTermMonths: number;
  maxTermMonths: number;
  ftpAnchors: number[];
  cor: number;
  opex: number;
  irrTarget: number;
  insuranceTable: InsuranceTable;
  brandSegmentMap: Record<string, string>;
}

export interface FinanceInputs {
  carPrice: number;
  termMonths: number;
  /** Annual profit rate, as a fraction or a percentage. */
  profitRate: number;
  downPaymentPct: number;
  adminFeesPct: number;
  balloonPaymentPct: number;
  insuranceSegment: InsuranceSegment;
  gender: Gender;
  ageBracket: AgeBracket;
  rebate?: number;
  carBrand?: string;
}

export interface ScheduleRowDto {
  month: number;
  outstandingStart: number;
  profit: number;
  principal: number;
  insurance: number;
  cashflow: number;
  outstandingEnd: number;
}

/** Everything a customer may be shown. */
export interface CustomerOffer {
  carPrice: number;
  termMonths: number;
  downPayment: number;
  downPaymentPct: number;
  financeAmount: number;
  balloonPayment: number;
  balloonPaymentPct: number;
  adminFees: number;
  baseInstallment: number;
  monthlyInsurance: number;
  monthlyPayment: number;
  lastMonthPayment: number;
  totalInsurance: number;
  totalProfit: number;
  totalPrincipal: number;
  grandTotal: number;
  profitRate: number;
  insuranceRate: number;
  insuranceSegment: InsuranceSegment;
  annualPremiums: number[];
  /** Null when the solver found no valid rate; never show a guess. */
  aprIncludingFees: number | null;
  flatProfitRate: number;
}

/** Bank-internal profitability. Never serialise this to a browser. */
export interface InternalMetrics {
  weightedFtp: number;
  breakeven: number;
  irr: number | null;
  netMargin: number | null;
  netProfit: number | null;
  irrGap: number | null;
}

export interface FinanceResult {
  customer: CustomerOffer;
  internal: InternalMetrics;
  schedule: ScheduleRowDto[];
}

/** Bank config with every default filled in. */
export function createBankConfig(overrides: Partial<BankConfig> = {}): BankConfig {
  return {
    bankId: "default_bank",
    adminFeesCap: DEFAULT_BANK_FINANCE.adminFeesCap,
    defaultAdminFeesPct: DEFAULT_BANK_FINANCE.defaultAdminFeesPct,
    minInsurancePremium: DEFAULT_BANK_FINANCE.minInsurancePremium,
    assetDepreciationRate: DEFAULT_BANK_FINANCE.assetDepreciationRate,
    minTermMonths: DEFAULT_BANK_FINANCE.minTermMonths,
    maxTermMonths: DEFAULT_BANK_FINANCE.maxTermMonths,
    ftpAnchors: [...DEFAULT_BANK_FINANCE.ftpAnchors],
    cor: DEFAULT_BANK_FINANCE.cor,
    opex: DEFAULT_BANK_FINANCE.opex,
    irrTarget: DEFAULT_BANK_FINANCE.irrTarget,
    insuranceTable: DEFAULT_INSURANCE_TABLE,
    brandSegmentMap: { ...DEFAULT_BRAND_SEGMENT_MAP },
    ...overrides,
  };
}

/**
 * Annual insurance rate for this customer and vehicle.
 *
 * Falls back along one axis at a time — unknown age bracket to the default
 * bracket, unknown segment to A — so a partially populated bank table still
 * quotes rather than failing. The segment itself is never defaulted upstream;
 * that is `resolveSegmentFromMap`'s job and it throws.
 */
export function lookupInsuranceRate(
  table: InsuranceTable,
  gender: Gender,
  ageBracket: AgeBracket,
  segment: InsuranceSegment,
): number {
  const genderTable = table[gender === "female" ? "female" : "male"];
  const ageTable = genderTable?.[ageBracket] ?? genderTable?.[DEFAULT_AGE_BRACKET];

  return ageTable?.[segment] ?? ageTable?.["A"] ?? 0.025;
}

export function calculateFinance(
  bankConfigInput: Partial<BankConfig>,
  inputs: FinanceInputs,
): FinanceResult {
  const config = createBankConfig(bankConfigInput);

  const carPrice = Number(inputs.carPrice);
  if (!Number.isFinite(carPrice) || carPrice <= 0) {
    throw AppError.validation("Car price must be greater than zero");
  }

  const termMonths = clamp(
    Math.round(Number(inputs.termMonths) || config.minTermMonths),
    config.minTermMonths,
    config.maxTermMonths,
  );

  const profitRate = normalizeRate(inputs.profitRate);
  const downPct = normalizeRate(inputs.downPaymentPct);
  const adminPct = normalizeRate(inputs.adminFeesPct);
  const balloonPct = normalizeRate(inputs.balloonPaymentPct);
  const rebate = Number(inputs.rebate ?? 0);

  const downPayment = carPrice * downPct;
  const financeAmount = Math.max(0, carPrice - downPayment);
  const balloonPayment = carPrice * balloonPct;

  // Fees are a percentage of the financed amount, capped by the bank.
  const adminFees = Math.round(Math.min(config.adminFeesCap, financeAmount * adminPct));

  const monthlyRate = profitRate / 12;
  const baseInstallment = pmt(monthlyRate, termMonths, -financeAmount, balloonPayment);

  const segment = validateInsuranceSegment(inputs.insuranceSegment);
  const insuranceRate = lookupInsuranceRate(
    config.insuranceTable,
    inputs.gender,
    inputs.ageBracket,
    segment,
  );

  const { totalInsurance, annualPremiums } = computeInsurance(
    carPrice,
    insuranceRate,
    termMonths,
    config.minInsurancePremium,
    config.assetDepreciationRate,
  );

  // Insurance is levelised across the term rather than charged in yearly lumps.
  const monthlyInsurance = totalInsurance / termMonths;

  const schedule = buildAmortisationSchedule(
    financeAmount,
    monthlyRate,
    termMonths,
    balloonPayment,
    baseInstallment,
  ).map((row) => ({
    month: row.month,
    outstandingStart: row.outstandingStart,
    profit: row.profit,
    principal: row.principal,
    insurance: monthlyInsurance,
    cashflow: row.principal + row.profit + monthlyInsurance,
    outstandingEnd: row.outstandingEnd,
  }));

  const totalCashflow = schedule.reduce((sum, row) => sum + row.cashflow, 0);
  const ftpMonthly = interpolateFtpMonthly(config.ftpAnchors, termMonths);

  // Funding cost weighted by when the money is actually outstanding.
  const weightedFtp = schedule.reduce((sum, row, index) => {
    const weight = totalCashflow > 0 ? row.cashflow / totalCashflow : 0;
    return sum + weight * (ftpMonthly[index] ?? 0);
  }, 0);

  const totalProfit = schedule.reduce((sum, row) => sum + row.profit, 0);
  const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
  const lastMonthPayment = schedule.at(-1)?.cashflow ?? baseInstallment + monthlyInsurance;

  const aprIncludingFees = computeAprIncludingFees({
    termMonths,
    baseInstallment,
    financeAmount,
    adminFees,
    balloonPayment,
    rebate,
  });

  const irr =
    aprIncludingFees != null ? ((1 + aprIncludingFees) ** (1 / 12) - 1) * 12 : null;
  const breakeven = weightedFtp + config.cor + config.opex;
  const netMargin = aprIncludingFees != null ? aprIncludingFees - breakeven : null;

  return {
    customer: {
      carPrice: round(carPrice),
      termMonths,
      downPayment: round(downPayment),
      downPaymentPct: downPct,
      financeAmount: round(financeAmount),
      balloonPayment: round(balloonPayment),
      balloonPaymentPct: balloonPct,
      adminFees: round(adminFees),
      baseInstallment: round(baseInstallment),
      monthlyInsurance: round(monthlyInsurance),
      monthlyPayment: round(baseInstallment + monthlyInsurance),
      lastMonthPayment: round(lastMonthPayment),
      totalInsurance: round(totalInsurance),
      totalProfit: round(totalProfit),
      totalPrincipal: round(totalPrincipal),
      grandTotal: round(totalPrincipal + totalInsurance + totalProfit + adminFees),
      profitRate,
      insuranceRate,
      insuranceSegment: segment,
      annualPremiums: annualPremiums.map((value) => round(value)),
      aprIncludingFees,
      flatProfitRate:
        financeAmount > 0 ? (totalProfit / financeAmount / termMonths) * 12 : 0,
    },
    internal: {
      weightedFtp,
      breakeven,
      irr,
      netMargin,
      netProfit: netMargin != null ? round(netMargin * financeAmount) : null,
      irrGap: irr != null ? config.irrTarget - irr : null,
    },
    schedule: schedule.map((row) => ({
      month: row.month,
      outstandingStart: round(row.outstandingStart),
      profit: round(row.profit),
      principal: round(row.principal),
      insurance: round(row.insurance),
      cashflow: round(row.cashflow),
      outstandingEnd: round(row.outstandingEnd),
    })),
  };
}
