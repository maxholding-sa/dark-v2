import {
  buildCustomerFinancingOffer,
  createBankConfigFromBank,
  LOAN_CALCULATOR_META,
} from "@/lib/loan-calculator";
import { getBalloonOptionsForBank, getProfitRateForSector } from "@/lib/bank-finance";
import { EMPLOYER_SECTORS } from "@/constants/employer-sectors";
import {
  isBrandInSegmentMap,
  parseBrandSegmentMap,
  validateInsuranceSegment,
} from "@/lib/brand-segment";
import { buildFinancingScenarioInputs } from "@/lib/financing-scenario-log";

const CURRENT_HIJRI_YEAR = 1447;
const CURRENT_GREGORIAN_YEAR = 2026;
const MAX_OFFERS_PER_BANK = 5;
const MAX_DOWN_PAYMENT_PCT = LOAN_CALCULATOR_META.maxDownPaymentPct;
const TERM_MONTHS = 60;

export const getAgeBracketFromBirthYear = (birthYear, birthDateType = "hijri") => {
  const year = Number.parseInt(birthYear, 10);
  if (!year) return "31 to 35";
  const currentYear = birthDateType === "gregorian" ? CURRENT_GREGORIAN_YEAR : CURRENT_HIJRI_YEAR;
  const age = currentYear - year;
  if (age <= 24) return "18 to 24";
  if (age <= 30) return "25 to 30";
  if (age <= 35) return "31 to 35";
  if (age <= 40) return "36 to 40";
  if (age <= 45) return "41 to 45";
  if (age <= 50) return "46 to 50";
  if (age <= 60) return "51 to 60";
  return "61+";
};

export const formatPercent = (value, digits = 2) =>
  `${Number(value || 0).toFixed(digits)}%`;

export const getEmployerSectorLabel = (value) =>
  EMPLOYER_SECTORS.find((sector) => sector.value === value)?.label || value || "غير محدد";

export const parseCarPrice = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value === "object" && typeof value.toString === "function") {
    return parseCarPrice(value.toString());
  }
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const getCarPrice = (car, formData) => {
  const fromCar = parseCarPrice(car?.price);
  if (fromCar > 0) return fromCar;
  return parseCarPrice(formData?.loanAmount);
};

export const getMaxDownPaymentSar = (carPrice) =>
  carPrice > 0 ? Math.floor(carPrice * MAX_DOWN_PAYMENT_PCT) : 0;

export const resolveDownPaymentSar = (formData, carPrice) => {
  const maxAllowed = getMaxDownPaymentSar(carPrice);
  const raw = formData?.downPayment;
  if (raw === "" || raw == null) return 0;
  const entered = Number(raw);
  if (!Number.isFinite(entered) || entered < 0) return 0;
  if (entered > maxAllowed) return null;
  return entered;
};

const compareOffersBestFirst = (a, b) => {
  if (a.monthlyPayment !== b.monthlyPayment) return a.monthlyPayment - b.monthlyPayment;
  if (a.downPayment !== b.downPayment) return a.downPayment - b.downPayment;
  return (a.totalPayment ?? 0) - (b.totalPayment ?? 0);
};

/**
 * Shared Islamic financing offer grid used by loan form + chatbot.
 */
export function generateIslamicOffers({ banks, formData, car }) {
  const carPrice = getCarPrice(car, formData);
  if (carPrice <= 0) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason:
        "لم يتم تحديد سعر لهذه السيارة. يرجى التواصل مع الإدارة لتحديث سعر السيارة.",
    };
  }
  if (!banks?.length) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: "جاري تحميل بيانات البنوك...",
    };
  }

  let insuranceSegment;
  try {
    insuranceSegment = validateInsuranceSegment(car.insuranceSegment);
  } catch {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason:
        "فئة التأمين غير محددة لهذه السيارة. يجب تعيين فئة التأمين (من جدول الماركات) قبل إنشاء العروض.",
    };
  }

  const eligibleBanks = banks.filter((bank) => {
    const bankConfig = createBankConfigFromBank(bank);
    const bankBrandMap = parseBrandSegmentMap(bank?.brandSegmentMap, bankConfig.brand_segment_map);
    return isBrandInSegmentMap(bankBrandMap, car.make);
  });

  if (!eligibleBanks.length) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: `ماركة "${car.make}" غير موجودة في جداول فئات أي بنك شريك. يلزم مراجعة يدوية أو تحديث جداول الفئات.`,
    };
  }

  if (!formData.employerSector) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason:
        "اختر قطاع جهة العمل أولاً حتى يتم حساب سعر الربح الصحيح لكل بنك حسب القطاع.",
    };
  }

  const selectedBank =
    banks.find((b) => b.id.toString() === formData.salaryTransferBank) || eligibleBanks[0];
  const selectedBankConfig = createBankConfigFromBank(selectedBank);
  const profitRate = getProfitRateForSector(selectedBank, formData.employerSector);
  const adminPct = selectedBankConfig.default_admin_fees_pct ?? 0.01;
  const ageBracket = getAgeBracketFromBirthYear(formData.birthYear, formData.birthDateType);
  const gender = formData.gender || "male";

  const requestedDownPayment = resolveDownPaymentSar(formData, carPrice);
  const requestedDownPaymentPct =
    requestedDownPayment != null && carPrice > 0 ? requestedDownPayment / carPrice : NaN;

  if (
    requestedDownPayment == null ||
    !Number.isFinite(requestedDownPaymentPct) ||
    requestedDownPayment < 0
  ) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: `أقصى دفعة أولى مسموحة هي ${getMaxDownPaymentSar(carPrice).toLocaleString("en-US")} ريال (${formatPercent(MAX_DOWN_PAYMENT_PCT * 100, 0)} من سعر السيارة).`,
    };
  }

  if (requestedDownPayment > getMaxDownPaymentSar(carPrice)) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: `أقصى دفعة أولى مسموحة هي ${getMaxDownPaymentSar(carPrice).toLocaleString("en-US")} ريال (${formatPercent(MAX_DOWN_PAYMENT_PCT * 100, 0)} من سعر السيارة).`,
    };
  }

  if (requestedDownPayment >= carPrice) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: "الدفعة الأولى يجب أن تكون أقل من سعر السيارة.",
    };
  }

  if (requestedDownPaymentPct > MAX_DOWN_PAYMENT_PCT) {
    return {
      offers: [],
      scenarioInputs: null,
      pricingBlocked: true,
      pricingBlockReason: `أعلى دفعة أولى متاحة حالياً هي ${formatPercent(MAX_DOWN_PAYMENT_PCT * 100, 0)} من سعر السيارة.`,
    };
  }

  const allowedDownPayments = [requestedDownPaymentPct];
  const scenarioInputs = buildFinancingScenarioInputs({
    car,
    formData,
    selectedBank,
    bankConfig: selectedBankConfig,
    profitRate,
    adminPct,
    ageBracket,
    gender,
  });

  const offers = [];
  let offerId = 1;

  for (const bank of eligibleBanks) {
    const bankConfig = createBankConfigFromBank(bank);
    const bankProfitRate = getProfitRateForSector(bank, formData.employerSector);
    const bankAdminPct = bankConfig.default_admin_fees_pct ?? 0.01;
    const balloonOptions = getBalloonOptionsForBank(bank);
    const bankCandidates = [];

    for (const downPct of allowedDownPayments) {
      for (const balloonPct of balloonOptions) {
        bankCandidates.push(
          buildCustomerFinancingOffer(
            bankConfig,
            {
              car_price: carPrice,
              down_payment_pct: downPct,
              term_months: TERM_MONTHS,
              profit_rate: bankProfitRate,
              admin_fees_pct: bankAdminPct,
              balloon_payment_pct: balloonPct,
              gender,
              age_bracket: ageBracket,
              insurance_segment: insuranceSegment,
              rebate: 0,
            },
            {
              id: 0,
              bankName: bank?.name || "بنك افتراضي",
              bankId: bank.id,
              bankLogo: bank?.logoImage || "",
              employerSector: formData.employerSector,
              employerSectorLabel: getEmployerSectorLabel(formData.employerSector),
              loanPolicy: bank?.loanPolicy || null,
              bankFinalPaymentPolicyPct: bank?.defaultBalloonPaymentPct ?? null,
            }
          )
        );
      }
    }

    const pricedCandidates = bankCandidates
      .filter((offer) => offer.pricingAvailable !== false)
      .filter((offer) => offer.downPaymentPct <= MAX_DOWN_PAYMENT_PCT * 100);
    const picked = pricedCandidates
      .sort(compareOffersBestFirst)
      .slice(0, MAX_OFFERS_PER_BANK)
      .map((offer) => ({
        ...offer,
        categoryId: `bank-${bank.id}`,
        categoryTitle: bank?.name || "بنك افتراضي",
      }));

    for (const offer of picked) {
      offers.push({ ...offer, id: offerId });
      offerId += 1;
    }
  }

  return { offers, scenarioInputs, pricingBlocked: false };
}

/** Serialize offers for chat JSON payloads (no functions / circular refs). */
export function serializeOffersForChat(offers = []) {
  return offers.map((offer) => ({
    id: offer.id,
    bankId: offer.bankId,
    bankName: offer.bankName,
    bankLogo: offer.bankLogo,
    categoryTitle: offer.categoryTitle,
    monthlyPayment: offer.monthlyPayment,
    downPayment: offer.downPayment,
    downPaymentPct: offer.downPaymentPct,
    balloonPayment: offer.balloonPayment,
    balloonPaymentPct: offer.balloonPaymentPct,
    termMonths: offer.termMonths,
    interestRate: offer.interestRate,
    totalPayment: offer.totalPayment,
    adminFees: offer.adminFees,
    totalInsurance: offer.totalInsurance,
    totalProfit: offer.totalProfit,
    baseInstallment: offer.baseInstallment,
    monthlyInsurance: offer.monthlyInsurance,
    lastMonthPayment: offer.lastMonthPayment,
    insuranceSegment: offer.insuranceSegment,
    employerSector: offer.employerSector,
    employerSectorLabel: offer.employerSectorLabel,
    loanPolicy: offer.loanPolicy,
    aprIncludingFees: offer.aprIncludingFees,
  }));
}
