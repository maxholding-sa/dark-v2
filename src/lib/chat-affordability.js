import { generateIslamicOffers } from "@/lib/generate-islamic-offers";
import { parseSalaryFromQuery, parseWesternDigits } from "@/lib/car-search";

export const DTI_THRESHOLD = 35;

const DEFAULT_FINANCING_ASSUMPTIONS = {
  employerSector: "حكومي مدني",
  gender: "male",
  birthDateType: "hijri",
  birthMonth: "1",
  birthYear: "1410",
  wantsDownPayment: "no",
  downPayment: "",
  hasRealEstateFinance: "no",
  hasCreditDefault: "no",
};

export function getMaxAffordableMonthlyPayment(netSalary, totalMonthlyObligations = 0) {
  const salary = Number(netSalary) || 0;
  const obligations = Number(totalMonthlyObligations) || 0;
  const availableIncome = Math.max(0, salary - obligations);
  return Math.floor(availableIncome * (DTI_THRESHOLD / 100));
}

export function isOfferAffordable(offer, netSalary, totalMonthlyObligations = 0) {
  const maxPayment = getMaxAffordableMonthlyPayment(netSalary, totalMonthlyObligations);
  if (maxPayment <= 0) return false;
  const monthlyPayment = Number(offer?.monthlyPayment) || 0;
  return monthlyPayment > 0 && monthlyPayment <= maxPayment;
}

function getCarOffersSafe(car, banks) {
  const carPrice = Number(car?.price) || 0;
  if (carPrice <= 0 || !banks?.length) return [];

  try {
    const { offers, pricingBlocked } = generateIslamicOffers({
      banks,
      formData: DEFAULT_FINANCING_ASSUMPTIONS,
      car,
    });
    if (pricingBlocked || !offers?.length) return [];
    return offers;
  } catch {
    return [];
  }
}

export function carHasAffordableOffer(car, banks, netSalary, totalMonthlyObligations = 0) {
  const offers = getCarOffersSafe(car, banks);
  if (!offers.length) return false;

  return offers.some((offer) =>
    isOfferAffordable(offer, netSalary, totalMonthlyObligations)
  );
}

export function carFitsMaxInstallment(car, banks, maxMonthlyPayment) {
  const max = Number(maxMonthlyPayment) || 0;
  if (max <= 0) return false;
  const offers = getCarOffersSafe(car, banks);
  if (!offers.length) return false;
  return offers.some((offer) => {
    const monthly = Number(offer?.monthlyPayment) || 0;
    return monthly > 0 && monthly <= max;
  });
}

export async function filterCarsByAffordability(cars, banks, netSalary, totalMonthlyObligations = 0) {
  if (!netSalary || !banks?.length || !cars?.length) return [];

  const affordable = [];
  for (const car of cars) {
    if (carHasAffordableOffer(car, banks, netSalary, totalMonthlyObligations)) {
      affordable.push(car);
    }
  }

  return affordable.sort((a, b) => Number(a.price) - Number(b.price));
}

export async function filterCarsByMaxInstallment(cars, banks, maxMonthlyPayment) {
  if (!maxMonthlyPayment || !banks?.length || !cars?.length) return [];

  const matched = [];
  for (const car of cars) {
    if (carFitsMaxInstallment(car, banks, maxMonthlyPayment)) {
      matched.push(car);
    }
  }

  return matched.sort((a, b) => Number(a.price) - Number(b.price));
}

export function parseAffordabilityFromText(text = "") {
  return parseSalaryFromQuery(text);
}

/** Parse explicit max monthly installment, e.g. "قسطها 1000 كحد اقصى". */
export function parseMaxInstallmentFromText(text = "") {
  const normalized = parseWesternDigits(String(text || ""));

  const patterns = [
    /(?:قسط(?:ها|ه|ي)?|أقساط|قسط\s*شهري|installment)\s*(?:يكون|يكون\s*بـ|بـ|ب|=|:)?\s*([\d,.]+)\s*(?:ريال|ر\.?\s*س)?\s*(?:كحد\s*(?:اقصى|أقصى)|حد\s*(?:اقصى|أقصى)|كحد\s*أعلى|ما\s*يزيد|لا\s*يتجاوز|أو\s*أقل|واقل)?/i,
    /(?:حد\s*(?:اقصى|أقصى)|كحد\s*(?:اقصى|أقصى)|أقصى|اقصى|max)\s*(?:قسط|أقساط|قسط\s*شهري)?\s*([\d,.]+)/i,
    /([\d,.]+)\s*(?:ريال|ر\.?\s*س)?\s*(?:كحد\s*(?:اقصى|أقصى)|حد\s*(?:اقصى|أقصى)).{0,12}(?:قسط|أقساط)/i,
    /(?:قسط|أقساط).{0,20}(?:تحت|أقل\s*من|اقل\s*من|لا\s*تتجاوز)\s*([\d,.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const amount = Number.parseFloat(String(match[1]).replace(/,/g, ""));
      if (Number.isFinite(amount) && amount > 0 && amount < 50000) {
        return Math.round(amount);
      }
    }
  }

  return null;
}

export function wantsSalaryRecommendation(text = "") {
  return /راتب|راتبي|دخلي|التزامات|التزاماتي|اقدر\s*اشتري|أقدر\s*أشتري|حسب\s*راتبي|ماذا\s*يعطيني|وش\s*يعطيني|يطلعلي|يطلّعلي|salary|afford|affordable|income/i.test(
    String(text || "")
  );
}

export function wantsInstallmentBudget(text = "") {
  const t = String(text || "");
  if (!/(?:قسط|أقساط|installment)/i.test(t)) return false;
  return parseMaxInstallmentFromText(t) != null;
}
