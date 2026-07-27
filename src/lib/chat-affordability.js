import { generateIslamicOffers } from "@/lib/generate-islamic-offers";
import { parseSalaryFromQuery } from "@/lib/car-search";

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

export function carHasAffordableOffer(car, banks, netSalary, totalMonthlyObligations = 0) {
  const carPrice = Number(car?.price) || 0;
  if (carPrice <= 0) return false;

  const { offers, pricingBlocked } = generateIslamicOffers({
    banks,
    formData: DEFAULT_FINANCING_ASSUMPTIONS,
    car,
  });

  if (pricingBlocked || !offers?.length) return false;

  return offers.some((offer) =>
    isOfferAffordable(offer, netSalary, totalMonthlyObligations)
  );
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

export function parseAffordabilityFromText(text = "") {
  return parseSalaryFromQuery(text);
}

export function wantsSalaryRecommendation(text = "") {
  return /راتب|راتبي|دخلي|التزامات|التزاماتي|اقدر\s*اشتري|أقدر\s*أشتري|حسب\s*راتبي|salary|afford|affordable|income/i.test(
    String(text || "")
  );
}
