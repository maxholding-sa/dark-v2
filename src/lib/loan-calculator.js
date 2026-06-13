const EPSILON = 1e-10;

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

export const DEFAULT_BANK_CONFIG = {
  admin_fees_cap: 5000,
  min_insurance_premium: 1650,
  ftp_anchors: [2.45, 2.7, 2.75, 2.78, 2.8, 2.46],
  cor: 0.0108,
  opex: 0.0048,
  irr_target: 0.0621,
  brand_segment_map: {},
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

const getSegmentForBrand = (brandSegmentMap, brand) => {
  if (!brand) return "A";
  return brandSegmentMap?.[brand] || brandSegmentMap?.[brand.toLowerCase?.()] || "A";
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

export function rate(nper, payment, pv, fv = 0, tol = 1e-8, maxIter = 100) {
  let r = 0.01;
  for (let i = 0; i < maxIter; i += 1) {
    const q = (1 + r) ** nper;
    const f = pv * q + payment * ((q - 1) / r) + fv;
    const df = nper * pv * (1 + r) ** (nper - 1) + payment * ((nper * r * (1 + r) ** (nper - 1) - q + 1) / (r * r));
    if (Math.abs(df) < EPSILON) break;
    const dr = f / df;
    r -= dr;
    if (Math.abs(dr) < tol) break;
  }
  return r;
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

function computeInsurance(baseSchedule, financeAmount, insuranceRate, termMonths, minPremium) {
  const years = Math.ceil(termMonths / 12);
  const annualPremiums = [];
  for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
    const startMonth = yearIndex * 12 + 1;
    const rowAtYearStart = baseSchedule.find((row) => row.month === startMonth);
    const outstandingAtYearStart = rowAtYearStart?.outstandingStart ?? financeAmount;
    const annualPremium = Math.max(outstandingAtYearStart * insuranceRate, minPremium);
    annualPremiums.push(annualPremium);
  }
  const totalInsurance = Math.ceil((annualPremiums.reduce((sum, value) => sum + value, 0) + Number.EPSILON) * 100) / 100;
  return { totalInsurance, annualPremiums };
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

export function createBankConfigFromBank(bank, overrides = {}) {
  return {
    ...DEFAULT_BANK_CONFIG,
    ...overrides,
    bank_id: bank?.id || "default_bank",
    brand_segment_map: {
      Toyota: "A",
      Hyundai: "B",
      Kia: "B",
      Jeep: "C",
      BMW: "D",
      Mercedes: "D",
      Nissan: "B",
      ...DEFAULT_BANK_CONFIG.brand_segment_map,
      ...(overrides?.brand_segment_map || {}),
    },
  };
}

export function calculateIslamicAutoFinance(bankConfigInput, inputs) {
  const bankConfig = { ...DEFAULT_BANK_CONFIG, ...(bankConfigInput || {}) };
  const term = Math.max(1, Number(inputs.term_months || 12));
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

  const segment = getSegmentForBrand(bankConfig.brand_segment_map, inputs.car_brand);
  const insuranceRate = getInsuranceRate(bankConfig.insurance_table, inputs.gender, inputs.age_bracket, segment);

  const baseSchedule = buildBaseSchedule(financeAmount, monthlyRate, term, balloonPayment, monthlyInstallment);
  const { totalInsurance, annualPremiums } = computeInsurance(
    baseSchedule,
    financeAmount,
    insuranceRate,
    term,
    Number(bankConfig.min_insurance_premium || 0)
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

  const monthlyRoiRate = rate(term, monthlyInstallment, -(financeAmount - rebate + totalInsurance), balloonPayment);
  const irr = monthlyRoiRate * 12;
  const apr = (1 + monthlyRoiRate) ** 12 - 1;

  const breakeven = weightedFtp + Number(bankConfig.cor || 0) + Number(bankConfig.opex || 0);
  const netMargin = apr - breakeven;
  const netProfit = netMargin * financeAmount;
  const irrGap = Number(bankConfig.irr_target || 0) - irr;

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
      apr,
      irr,
      net_margin: netMargin,
      net_profit: round(netProfit, 2),
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
};
