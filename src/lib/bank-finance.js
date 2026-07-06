import {
  DEFAULT_BANK_FINANCE_DEFAULTS,
  DEFAULT_BRAND_SEGMENT_MAP,
  DEFAULT_INSURANCE_TABLE,
  LOAN_CALCULATOR_META,
} from "@/lib/loan-calculator";
import { EMPLOYER_SECTOR_VALUES } from "@/constants/employer-sectors";

const parseJsonField = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const numericBankFinanceFormState = () => ({
  adminFeesCap: String(DEFAULT_BANK_FINANCE_DEFAULTS.adminFeesCap),
  defaultAdminFeesPct: String(DEFAULT_BANK_FINANCE_DEFAULTS.defaultAdminFeesPct * 100),
  minInsurancePremium: String(DEFAULT_BANK_FINANCE_DEFAULTS.minInsurancePremium),
  assetDepreciationRate: String(DEFAULT_BANK_FINANCE_DEFAULTS.assetDepreciationRate),
  cor: String(DEFAULT_BANK_FINANCE_DEFAULTS.cor),
  opex: String(DEFAULT_BANK_FINANCE_DEFAULTS.opex),
  irrTarget: String(DEFAULT_BANK_FINANCE_DEFAULTS.irrTarget),
});

export const emptySectorInterestRatesFormState = () =>
  Object.fromEntries(EMPLOYER_SECTOR_VALUES.map((sector) => [sector, ""]));

export const sectorInterestRatesFormStateFromRecord = (bank) => {
  const empty = emptySectorInterestRatesFormState();
  if (!bank) return empty;

  const rates = bank.sectorInterestRates;
  if (rates && typeof rates === "object") {
    return EMPLOYER_SECTOR_VALUES.reduce((acc, sector) => {
      acc[sector] =
        rates[sector] != null
          ? String(rates[sector])
          : bank.interestRate != null
            ? String(bank.interestRate)
            : "";
      return acc;
    }, {});
  }

  const fallback = bank.interestRate != null ? String(bank.interestRate) : "";
  return EMPLOYER_SECTOR_VALUES.reduce((acc, sector) => {
    acc[sector] = fallback;
    return acc;
  }, {});
};

export const parseSectorInterestRatesPayload = (payload = {}) => {
  const errors = [];
  const rates = {};

  for (const sector of EMPLOYER_SECTOR_VALUES) {
    const raw = payload.sectorInterestRates?.[sector] ?? payload[`sectorRate_${sector}`];
    if (raw == null || raw === "") {
      errors.push(`سعر الفائدة مطلوب لـ ${sector}`);
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      errors.push(`سعر الفائدة غير صالح لـ ${sector}`);
      continue;
    }
    rates[sector] = n;
  }

  return { errors, data: errors.length ? null : rates };
};

/** Profit margin % for a given employer sector. */
export function getProfitRateForSector(bank, employerSector) {
  const sectorRates = bank?.sectorInterestRates;
  if (sectorRates && employerSector && sectorRates[employerSector] != null) {
    return Number(sectorRates[employerSector]);
  }
  return Number(bank?.interestRate ?? 4.5);
}

/** Balloon / last-payment options for offer grid (decimal fractions). */
export function getBalloonOptionsForBank(bank) {
  const pct = bank?.defaultBalloonPaymentPct;
  if (pct != null && Number.isFinite(Number(pct))) {
    return [Number(pct) / 100];
  }
  return LOAN_CALCULATOR_META.balloonOptions;
}

export const emptyBankFinanceFormState = () => ({
  ...numericBankFinanceFormState(),
  ftpAnchors: JSON.stringify(DEFAULT_BANK_FINANCE_DEFAULTS.ftpAnchors, null, 2),
  brandSegmentMap: JSON.stringify(DEFAULT_BRAND_SEGMENT_MAP, null, 2),
  insuranceTable: JSON.stringify(DEFAULT_INSURANCE_TABLE, null, 2),
});

/** Compact defaults for new bank form — JSON tables omitted until expanded. */
export const newBankFinanceFormState = () => ({
  ...numericBankFinanceFormState(),
  ftpAnchors: "",
  brandSegmentMap: "",
  insuranceTable: "",
});

export const bankFinanceFormStateFromRecord = (bank) => {
  const defaults = emptyBankFinanceFormState();
  if (!bank) return defaults;

  return {
    adminFeesCap: bank.adminFeesCap != null ? String(bank.adminFeesCap) : defaults.adminFeesCap,
    defaultAdminFeesPct:
      bank.defaultAdminFeesPct != null
        ? String(Number(bank.defaultAdminFeesPct) * 100)
        : defaults.defaultAdminFeesPct,
    minInsurancePremium:
      bank.minInsurancePremium != null ? String(bank.minInsurancePremium) : defaults.minInsurancePremium,
    assetDepreciationRate:
      bank.assetDepreciationRate != null
        ? String(bank.assetDepreciationRate)
        : defaults.assetDepreciationRate,
    cor: bank.cor != null ? String(bank.cor) : defaults.cor,
    opex: bank.opex != null ? String(bank.opex) : defaults.opex,
    irrTarget: bank.irrTarget != null ? String(bank.irrTarget) : defaults.irrTarget,
    ftpAnchors: bank.ftpAnchors
      ? JSON.stringify(bank.ftpAnchors, null, 2)
      : defaults.ftpAnchors,
    brandSegmentMap: bank.brandSegmentMap
      ? JSON.stringify(bank.brandSegmentMap, null, 2)
      : defaults.brandSegmentMap,
    insuranceTable: bank.insuranceTable
      ? JSON.stringify(bank.insuranceTable, null, 2)
      : defaults.insuranceTable,
  };
};

export const parseBankFinancePayload = (payload = {}) => {
  const errors = [];
  const ftpAnchors = parseJsonField(payload.ftpAnchors, DEFAULT_BANK_FINANCE_DEFAULTS.ftpAnchors);
  const brandSegmentMap = parseJsonField(payload.brandSegmentMap, DEFAULT_BRAND_SEGMENT_MAP);
  const insuranceTable = parseJsonField(payload.insuranceTable, DEFAULT_INSURANCE_TABLE);

  if (payload.ftpAnchors && ftpAnchors == null) errors.push("ftpAnchors JSON غير صالح");
  if (payload.brandSegmentMap && brandSegmentMap == null) errors.push("brandSegmentMap JSON غير صالح");
  if (payload.insuranceTable && insuranceTable == null) errors.push("insuranceTable JSON غير صالح");

  const toDecimal = (value) => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const adminFeesPctRaw = toDecimal(payload.defaultAdminFeesPct);
  const defaultAdminFeesPct =
    adminFeesPctRaw == null
      ? null
      : adminFeesPctRaw > 1
        ? adminFeesPctRaw / 100
        : adminFeesPctRaw;

  return {
    errors,
    data: {
      adminFeesCap: toDecimal(payload.adminFeesCap),
      defaultAdminFeesPct,
      minInsurancePremium: toDecimal(payload.minInsurancePremium),
      assetDepreciationRate: toDecimal(payload.assetDepreciationRate),
      cor: toDecimal(payload.cor),
      opex: toDecimal(payload.opex),
      irrTarget: toDecimal(payload.irrTarget),
      ftpAnchors: Array.isArray(ftpAnchors) ? ftpAnchors : null,
      brandSegmentMap: brandSegmentMap && typeof brandSegmentMap === "object" ? brandSegmentMap : null,
      insuranceTable: insuranceTable && typeof insuranceTable === "object" ? insuranceTable : null,
    },
  };
};

/** True when this bank can produce APR (inc. fees) — uses persisted params or engine defaults. */
export function isBankAprConfigured(bank) {
  return Boolean(bank);
}

export const serializeBankRecord = (bank) => {
  if (!bank) return null;
  const decimal = (value) => (value != null ? parseFloat(value.toString()) : null);
  const sectorInterestRates =
    bank.sectorInterestRates && typeof bank.sectorInterestRates === "object"
      ? Object.fromEntries(
          Object.entries(bank.sectorInterestRates).map(([k, v]) => [k, parseFloat(String(v))])
        )
      : null;

  return {
    id: bank.id,
    name: bank.name,
    logoImage: bank.logoImage,
    interestRate: bank.interestRate != null ? parseFloat(bank.interestRate.toString()) : 0,
    sectorInterestRates,
    defaultBalloonPaymentPct: decimal(bank.defaultBalloonPaymentPct),
    loanPolicy: bank.loanPolicy ?? null,
    adminFeesCap: decimal(bank.adminFeesCap),
    defaultAdminFeesPct: decimal(bank.defaultAdminFeesPct),
    minInsurancePremium: decimal(bank.minInsurancePremium),
    assetDepreciationRate: decimal(bank.assetDepreciationRate),
    ftpAnchors: bank.ftpAnchors ?? null,
    cor: decimal(bank.cor),
    opex: decimal(bank.opex),
    irrTarget: decimal(bank.irrTarget),
    brandSegmentMap: bank.brandSegmentMap ?? null,
    insuranceTable: bank.insuranceTable ?? null,
    createdAt: bank.createdAt instanceof Date ? bank.createdAt.toISOString() : bank.createdAt,
    updatedAt: bank.updatedAt instanceof Date ? bank.updatedAt.toISOString() : bank.updatedAt,
  };
};
