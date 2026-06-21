import {
  calculateIslamicAutoFinance,
  createBankConfigFromBank,
  LOAN_CALCULATOR_META,
} from "@/lib/loan-calculator";
import { isBankAprConfigured } from "@/lib/bank-finance";

let lastLoggedScenarioKey = null;

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

export function buildFinancingScenarioInputs({
  car,
  formData,
  selectedBank,
  bankConfig,
  profitRate,
  adminPct,
  ageBracket,
  gender,
}) {
  return {
    car: {
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      price: round(Number(car.price) || 0),
      insuranceSegment: car.insuranceSegment || null,
    },
    customer: {
      gender,
      birthYear: formData.birthYear || null,
      birthMonth: formData.birthMonth || null,
      ageBracket,
      salaryTransferBankId: formData.salaryTransferBank || null,
    },
    bank: {
      id: selectedBank?.id ?? null,
      name: selectedBank?.name ?? null,
      interestRate: round(Number(selectedBank?.interestRate ?? profitRate)),
      adminFeesCap: selectedBank?.adminFeesCap ?? null,
      defaultAdminFeesPct: selectedBank?.defaultAdminFeesPct ?? null,
      minInsurancePremium: selectedBank?.minInsurancePremium ?? null,
      assetDepreciationRate: selectedBank?.assetDepreciationRate ?? null,
      aprConfigured: isBankAprConfigured(selectedBank),
    },
    engineParams: {
      profit_rate: round(Number(profitRate)),
      admin_fees_pct: round(adminPct, 4),
      car_brand: car.make,
      insurance_segment: car.insuranceSegment || null,
      rebate: 0,
      scenarioGrid: {
        termsMonths: LOAN_CALCULATOR_META.financingTerms,
        downPaymentPct: LOAN_CALCULATOR_META.downPaymentOptions.map((v) => round(v * 100)),
        balloonPct: LOAN_CALCULATOR_META.balloonOptions.map((v) => round(v * 100)),
      },
    },
    resolvedBankConfig: {
      admin_fees_cap: bankConfig.admin_fees_cap,
      default_admin_fees_pct: bankConfig.default_admin_fees_pct,
      min_insurance_premium: bankConfig.min_insurance_premium,
      asset_depreciation_rate: bankConfig.asset_depreciation_rate,
    },
  };
}

function serializeOffer(offer) {
  return {
    id: offer.id,
    bankName: offer.bankName,
    termMonths: offer.termMonths,
    downPaymentPct: offer.downPaymentPct,
    balloonPaymentPct: offer.balloonPaymentPct,
    profitRateAnnual: offer.profitRateAnnual,
    apr: offer.apr,
    aprAvailable: offer.aprAvailable,
    downPayment: round(offer.downPayment),
    monthlyPayment: round(offer.monthlyPayment),
    baseInstallment: round(offer.baseInstallment),
    monthlyInsurance: round(offer.monthlyInsurance),
    adminFees: round(offer.adminFees),
    balloonPayment: round(offer.balloonPayment),
    lastMonthPayment: round(offer.lastMonthPayment),
    totalInsurance: round(offer.totalInsurance),
    totalProfit: round(offer.totalProfit),
    totalPayment: round(offer.totalPayment),
    insuranceSegment: offer.insuranceSegment,
  };
}

function buildSampleEngineTrace(bankConfig, sampleInputs) {
  const result = calculateIslamicAutoFinance(bankConfig, sampleInputs);
  return {
    sampleInputs,
    derived: result.derived,
    totals: result.totals,
    metrics: {
      apr_including_fees: result.metrics.apr_including_fees,
      apr_including_fees_pct: round((result.metrics.apr_including_fees ?? 0) * 100),
      irr: result.metrics.irr,
    },
    insuranceModel: {
      annualPremiums: result.derived.annual_premiums,
      minPremiumFloor: bankConfig.min_insurance_premium ?? null,
      assetDepreciationRate: bankConfig.asset_depreciation_rate ?? null,
      note: "Year 1: max(depreciatedAssetValue × segmentRate, minPremiumFloor); years 2+: depreciated value × rate only (no floor)",
    },
    scheduleFirstMonth: result.schedule[0] ?? null,
    scheduleLastMonth: result.schedule[result.schedule.length - 1] ?? null,
  };
}

/**
 * Logs a copy-paste JSON scenario for manual verification.
 * Dedupes identical input sets to avoid spam on re-renders.
 */
export function logFinancingOfferScenario({
  inputs,
  offers,
  displayed,
  selectedOffer = null,
  label = "offers-generated",
}) {
  if (typeof window === "undefined") return;

  const scenarioKey = JSON.stringify({ inputs, label, selectedOfferId: selectedOffer?.id ?? null });
  if (scenarioKey === lastLoggedScenarioKey) return;
  lastLoggedScenarioKey = scenarioKey;

  const sampleInputs = {
    car_price: inputs.car.price,
    down_payment_pct: LOAN_CALCULATOR_META.downPaymentOptions[1],
    term_months: 60,
    profit_rate: inputs.engineParams.profit_rate,
    admin_fees_pct: inputs.engineParams.admin_fees_pct,
    balloon_payment_pct: LOAN_CALCULATOR_META.balloonOptions[1],
    gender: inputs.customer.gender,
    age_bracket: inputs.customer.ageBracket,
    car_brand: inputs.engineParams.car_brand,
    insurance_segment: inputs.engineParams.insurance_segment,
    rebate: 0,
  };

  const bankConfig = createBankConfigFromBank({
    id: inputs.bank.id,
    name: inputs.bank.name,
    interestRate: inputs.bank.interestRate,
    adminFeesCap: inputs.bank.adminFeesCap,
    defaultAdminFeesPct: inputs.bank.defaultAdminFeesPct,
    minInsurancePremium: inputs.bank.minInsurancePremium,
    assetDepreciationRate: inputs.bank.assetDepreciationRate,
  });

  const payload = {
    label,
    generatedAt: new Date().toISOString(),
    inputs,
    outputs: {
      totalOffers: offers.length,
      offers: offers.map(serializeOffer),
      displayedOnScreen: displayed
        ? {
            lowestDownPayment: displayed.lowestDownOffers?.map(serializeOffer) ?? [],
            lowestMonthlyPayment: displayed.lowestMonthlyOffers?.map(serializeOffer) ?? [],
            highestFinalPayment: displayed.highestFinalOffers?.map(serializeOffer) ?? [],
          }
        : undefined,
      selectedOffer: selectedOffer ? serializeOffer(selectedOffer) : null,
    },
    engineTraceSample: buildSampleEngineTrace(bankConfig, sampleInputs),
  };

  window.__lastFinancingScenario = payload;

  console.group("[financing-scenario] COPY JSON BELOW — verify against your spreadsheet");
  console.log(JSON.stringify(payload, null, 2));
  console.groupEnd();
  console.info(
    "[financing-scenario] Also available as window.__lastFinancingScenario — paste JSON.stringify(window.__lastFinancingScenario, null, 2) in console to copy again."
  );
}
