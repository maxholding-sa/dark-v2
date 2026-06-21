import {
  DEFAULT_BANK_FINANCE_DEFAULTS,
  DEFAULT_BRAND_SEGMENT_MAP,
  DEFAULT_INSURANCE_TABLE,
} from "@/lib/loan-calculator";

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
  return {
    ...bank,
    interestRate: bank.interestRate ? parseFloat(bank.interestRate.toString()) : 0,
    adminFeesCap: decimal(bank.adminFeesCap),
    defaultAdminFeesPct: decimal(bank.defaultAdminFeesPct),
    minInsurancePremium: decimal(bank.minInsurancePremium),
    assetDepreciationRate: decimal(bank.assetDepreciationRate),
    cor: decimal(bank.cor),
    opex: decimal(bank.opex),
    irrTarget: decimal(bank.irrTarget),
    createdAt: bank.createdAt instanceof Date ? bank.createdAt.toISOString() : bank.createdAt,
    updatedAt: bank.updatedAt instanceof Date ? bank.updatedAt.toISOString() : bank.updatedAt,
  };
};
