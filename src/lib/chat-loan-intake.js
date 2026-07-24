import { EMPLOYER_SECTORS } from "@/constants/employer-sectors";

export const LOAN_CHAT_MODES = {
  IDLE: "idle",
  CAR_SELECT: "car_select",
  LOAN_INTAKE: "loan_intake",
  OFFERS: "offers",
  CONTACT_INTAKE: "contact_intake",
  ADMIN_CONTACT: "admin_contact",
  SUBMITTED: "submitted",
};

/** Fields required before generating offers (same prerequisites as the loan form). */
export const LOAN_OFFER_FIELD_ORDER = [
  "employerSector",
  "gender",
  "birthDateType",
  "birthMonth",
  "birthYear",
  "wantsDownPayment",
  "downPayment",
];

/** Fields required after offer selection to submit LoanRequest. */
export const LOAN_SUBMIT_FIELD_ORDER = [
  "fullName",
  "mobileNumber",
  "email",
  "city",
  "time",
  "idNumber",
  "netSalary",
  "employer",
  "hasRealEstateFinance",
  "hasCreditDefault",
  "totalMonthlyObligations",
];

/** Minimal lead fields when car price is 0 / on-request. */
export const ADMIN_CONTACT_FIELD_ORDER = ["fullName", "mobileNumber", "email"];

export const MAX_DOWN_PAYMENT_PCT_CHAT = 0.45;

export const emptyLoanState = () => ({
  carId: null,
  carSummary: null,
  fields: {
    employerSector: "",
    gender: "",
    birthDateType: "hijri",
    birthMonth: "",
    birthYear: "",
    wantsDownPayment: "",
    downPayment: "",
    fullName: "",
    mobileNumber: "",
    email: "",
    city: "",
    time: "",
    idNumber: "",
    netSalary: "",
    employer: "",
    salaryTransferBank: "",
    hasRealEstateFinance: "",
    hasCreditDefault: "",
    totalMonthlyObligations: "",
    additionalInfo: "",
  },
  selectedOffer: null,
  offers: [],
  loanRequestId: null,
});

export const FIELD_PROMPTS = {
  employerSector: {
    question:
      "ما هو قطاع جهة عملك؟\nاختر: قطاع خاص / حكومي مدني / حكومي عسكرى / متقاعد",
    options: EMPLOYER_SECTORS.map((s) => ({ value: s.value, label: s.label })),
  },
  gender: {
    question: "ما هو النوع؟\nاختر: ذكر / أنثى",
    options: [
      { value: "male", label: "ذكر" },
      { value: "female", label: "أنثى" },
    ],
  },
  birthDateType: {
    question: "هل تاريخ الميلاد بالهجري أم الميلادي؟",
    options: [
      { value: "hijri", label: "هجري" },
      { value: "gregorian", label: "ميلادي" },
    ],
  },
  birthMonth: {
    question: "ما هو شهر الميلاد؟ (رقم من 1 إلى 12)",
  },
  birthYear: {
    question: "ما هي سنة الميلاد؟ (مثال: 1410 للهجري أو 1990 للميلادي)",
  },
  wantsDownPayment: {
    question:
      "هل تريد دفع دفعة أولى؟\nالحد الأقصى للدفعة الأولى 45% من سعر السيارة.",
    options: [
      { value: "yes", label: "نعم" },
      { value: "no", label: "لا" },
    ],
  },
  downPayment: {
    question:
      "كم مبلغ الدفعة الأولى بالريال؟\n(الحد الأقصى 45% من سعر السيارة)",
  },
  fullName: { question: "ما هو الاسم الكامل؟" },
  mobileNumber: {
    question: "ما هو رقم الجوال؟ (9 أرقام بعد 5، بدون مفتاح الدولة)",
  },
  email: { question: "ما هو البريد الإلكتروني؟" },
  city: { question: "في أي مدينة تسكن؟" },
  time: {
    question: "ما الوقت المفضل للتواصل؟ (صباحاً / مساءً / أي وقت)",
  },
  idNumber: { question: "ما هو رقم الهوية الوطنية؟ (10 أرقام)" },
  netSalary: { question: "ما هو صافي الراتب الشهري بالريال؟" },
  employer: { question: "ما اسم جهة العمل؟" },
  hasRealEstateFinance: {
    question: "هل لديك تمويل عقاري حالياً؟ (نعم / لا)",
    options: [
      { value: "yes", label: "نعم" },
      { value: "no", label: "لا" },
    ],
  },
  hasCreditDefault: {
    question: "هل يوجد تعثر ائتماني؟ (نعم / لا)",
    options: [
      { value: "yes", label: "نعم" },
      { value: "no", label: "لا" },
    ],
  },
  totalMonthlyObligations: {
    question: "كم مجموع الالتزامات الشهرية بالريال؟ (اكتب 0 إن لم يوجد)",
  },
};

export function getNextMissingField(loanState, order) {
  const fields = loanState?.fields || {};
  for (const key of order) {
    const value = fields[key];

    if (key === "downPayment") {
      // Only ask amount if customer chose to pay a first payment.
      if (fields.wantsDownPayment !== "yes") continue;
      if (value === "" || value == null) return key;
      continue;
    }

    if (key === "totalMonthlyObligations") {
      if (value === "" || value == null) return key;
      continue;
    }

    if (value === "" || value == null) return key;
  }
  return null;
}

export function parseLoanFieldAnswer(fieldKey, rawText, context = {}) {
  const text = String(rawText || "").trim();
  if (!text) return { ok: false, error: "يرجى إدخال قيمة." };

  switch (fieldKey) {
    case "employerSector": {
      const lower = text.toLowerCase();
      const match = EMPLOYER_SECTORS.find(
        (s) =>
          s.value === text ||
          s.label === text ||
          lower.includes("خاص") ||
          (lower.includes("مدني") && text.includes("حكوم")) ||
          lower.includes("عسكر") ||
          lower.includes("متقاعد")
      );
      if (text.includes("خاص") || lower.includes("private")) {
        return { ok: true, value: "خاص" };
      }
      if (text.includes("عسكر")) return { ok: true, value: "حكومي عسكرى" };
      if (text.includes("متقاعد")) return { ok: true, value: "متقاعد" };
      if (text.includes("مدني") || (text.includes("حكوم") && !text.includes("عسكر"))) {
        return { ok: true, value: "حكومي مدني" };
      }
      if (match) return { ok: true, value: match.value };
      return {
        ok: false,
        error: "اختر أحد القطاعات: قطاع خاص / حكومي مدني / حكومي عسكرى / متقاعد",
      };
    }
    case "gender": {
      if (/أنث|انث|female|فيميل|بنت|امرأة/i.test(text)) return { ok: true, value: "female" };
      if (/ذكر|male|رجل/i.test(text)) return { ok: true, value: "male" };
      return { ok: false, error: "اختر: ذكر أو أنثى" };
    }
    case "birthDateType": {
      if (/ميلاد|gregorian|نصر/i.test(text)) return { ok: true, value: "gregorian" };
      if (/هجر|hijri/i.test(text)) return { ok: true, value: "hijri" };
      return { ok: false, error: "اختر: هجري أو ميلادي" };
    }
    case "birthMonth": {
      const n = Number(text.replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || n < 1 || n > 12) {
        return { ok: false, error: "أدخل رقم الشهر من 1 إلى 12" };
      }
      return { ok: true, value: String(n) };
    }
    case "birthYear": {
      const n = Number(text.replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || String(n).length !== 4) {
        return { ok: false, error: "أدخل سنة صحيحة من 4 أرقام" };
      }
      return { ok: true, value: String(n) };
    }
    case "wantsDownPayment": {
      if (/^نعم|yes|y|أبي|ابغى|اريد|أريد|موافق/i.test(text)) {
        return { ok: true, value: "yes" };
      }
      if (/^لا|no|n|بدون|ما ابغى|ما أبي|مو لازم/i.test(text)) {
        return { ok: true, value: "no" };
      }
      return { ok: false, error: "أجب بنعم أو لا" };
    }
    case "downPayment": {
      const n = Number(String(text).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, error: "أدخل مبلغ دفعة أولى أكبر من صفر" };
      }
      const carPrice = Number(context.carPrice);
      if (Number.isFinite(carPrice) && carPrice > 0) {
        const maxAllowed = Math.floor(carPrice * MAX_DOWN_PAYMENT_PCT_CHAT);
        if (n > maxAllowed) {
          return {
            ok: false,
            error: `أقصى دفعة أولى مسموحة هي ${maxAllowed.toLocaleString("en-US")} ر.س (45% من سعر السيارة)`,
          };
        }
      }
      return { ok: true, value: String(Math.round(n)) };
    }
    case "netSalary":
    case "totalMonthlyObligations": {
      const n = Number(String(text).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: "أدخل مبلغاً صحيحاً (يمكن 0)" };
      }
      return { ok: true, value: String(Math.round(n)) };
    }
    case "mobileNumber": {
      let digits = text.replace(/\D/g, "");
      if (digits.startsWith("966")) digits = digits.slice(3);
      if (digits.startsWith("0")) digits = digits.slice(1);
      if (!/^5\d{8}$/.test(digits)) {
        return { ok: false, error: "أدخل رقم جوال سعودي صحيح (يبدأ بـ 5 وطوله 9 أرقام)" };
      }
      return { ok: true, value: digits };
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { ok: false, error: "أدخل بريداً إلكترونياً صحيحاً" };
      }
      return { ok: true, value: text };
    }
    case "idNumber": {
      const digits = text.replace(/\D/g, "");
      if (!/^\d{10}$/.test(digits)) {
        return { ok: false, error: "رقم الهوية يجب أن يكون 10 أرقام" };
      }
      return { ok: true, value: digits };
    }
    case "hasRealEstateFinance":
    case "hasCreditDefault": {
      if (/^نعم|yes|y|فيه|لدي/i.test(text)) return { ok: true, value: "yes" };
      if (/^لا|no|n|بدون|ما عند/i.test(text)) return { ok: true, value: "no" };
      return { ok: false, error: "أجب بنعم أو لا" };
    }
    case "fullName":
    case "city":
    case "time":
    case "employer":
      if (text.length < 2) return { ok: false, error: "يرجى إدخال قيمة أوضح" };
      return { ok: true, value: text };
    default:
      return { ok: true, value: text };
  }
}

export function buildFieldPromptPayload(fieldKey) {
  const meta = FIELD_PROMPTS[fieldKey];
  if (!meta) return null;
  return {
    fieldKey,
    question: meta.question,
    options: meta.options || null,
  };
}

export function wantsFinancingFlow(message) {
  return /تقسيط|تمويل|قرض|قسط|أقساط|عرض تمويلي|احسب.*(قسط|تمويل)|موّل|مولني|أبي تمويل|ابغى تمويل|loan|finance|installment/i.test(
    String(message || "")
  );
}

export function wantsCancelLoanFlow(message) {
  return /الغاء|إلغاء|cancel|توقف|ارجع|رجوع|مو ببغى تمويل|ما ابغى تمويل/i.test(
    String(message || "")
  );
}

export function conversationTitleFromMessage(message) {
  const text = String(message || "").trim().replace(/\s+/g, " ");
  if (!text) return "محادثة جديدة";
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}
