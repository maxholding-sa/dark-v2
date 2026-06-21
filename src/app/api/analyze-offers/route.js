import { NextResponse } from "next/server";

const DTI_THRESHOLD = 35;

const asNumber = (value, fallback = 0) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatCurrency = (amount) => {
  if (!Number.isFinite(amount)) return "غير محدد";
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function validateInput(offers, userData) {
  if (!offers || !Array.isArray(offers)) {
    return { message: "يجب تقديم قائمة بالعروض للتحليل", status: 400 };
  }
  if (offers.length < 2) {
    return { message: "يجب تقديم عرضين على الأقل للمقارنة", status: 400 };
  }
  if (!userData || typeof userData !== "object") {
    return { message: "بيانات المستخدم مطلوبة", status: 400 };
  }
  return null;
}

function assessRisk({ employerSector, hasCreditDefault, hasRealEstateFinance, availableIncome }) {
  let score = 0;
  const factors = [];

  if (availableIncome <= 0) {
    score += 3;
    factors.push("الدخل المتاح لا يغطي الالتزامات الحالية");
  } else if (availableIncome < 1500) {
    score += 2;
    factors.push("الدخل المتاح منخفض");
  }

  if (hasCreditDefault === "yes") {
    score += 2;
    factors.push("وجود تعثر ائتماني");
  }
  if (hasRealEstateFinance === "yes") {
    score += 1;
    factors.push("وجود تمويل عقاري قائم");
  }
  if (employerSector === "خاص") {
    score += 0.5;
    factors.push("قطاع خاص");
  }

  if (score >= 4) return { level: "عالي", factors };
  if (score >= 2) return { level: "متوسط", factors };
  return { level: "منخفض", factors };
}

function analyzeOffer(offer, availableIncome, carPrice) {
  const monthlyPayment = asNumber(offer.monthlyPayment);
  const downPayment = asNumber(offer.downPayment);
  const termMonths = Math.max(1, asNumber(offer.termMonths, 12));
  const totalPayment = asNumber(offer.totalPayment, downPayment + monthlyPayment * termMonths);
  const totalProfit = asNumber(offer.totalProfit, 0);
  const totalInsurance = asNumber(offer.totalInsurance, 0);
  const interestRate = asNumber(offer.interestRate, 0);
  const finalPayment = asNumber(
    offer.lastMonthPayment ?? offer.finalPayment,
    0
  );
  const adminFees = asNumber(offer.adminFees, 0);

  const paymentToIncomeRatio = availableIncome > 0 ? (monthlyPayment / availableIncome) * 100 : 100;
  const isAffordable = paymentToIncomeRatio <= DTI_THRESHOLD;
  const loanAmount = Math.max(0, asNumber(carPrice) - downPayment);

  return {
    id: offer.id,
    title:
      offer.title ||
      `دفعة ${formatCurrency(downPayment)}، قسط ${formatCurrency(monthlyPayment)} (${Math.floor(termMonths / 12)} سنوات)`,
    bankName: offer.bankName || "غير محدد",
    downPayment,
    monthlyPayment,
    termMonths,
    termYears: Math.floor(termMonths / 12),
    totalCost: totalPayment,
    totalProfit,
    totalInsurance,
    interestRate,
    finalPayment,
    adminFees,
    loanAmount,
    paymentToIncomeRatio: Number(paymentToIncomeRatio.toFixed(1)),
    isAffordable,
  };
}

function buildRecommendations(analyzedOffers, risk) {
  const affordable = analyzedOffers.filter((o) => o.isAffordable);
  const byCost = [...analyzedOffers].sort((a, b) => a.totalCost - b.totalCost)[0];
  const byMonthly = [...analyzedOffers].sort((a, b) => a.monthlyPayment - b.monthlyPayment)[0];

  const primary = [];
  const warnings = [];
  const suggestions = [];

  if (affordable.length > 0) {
    primary.push(`أفضل تكلفة إجمالية: العرض ${byCost.id} (${formatCurrency(byCost.totalCost)})`);
    primary.push(`أخف قسط شهري: العرض ${byMonthly.id} (${formatCurrency(byMonthly.monthlyPayment)})`);
  } else {
    warnings.push("لا يوجد عرض ضمن حد التحمل الشهري الحالي");
    suggestions.push("رفع الدفعة الأولى أو اختيار مدة أطول لتقليل القسط الشهري");
  }

  if (risk.level === "عالي") {
    warnings.push("مستوى المخاطر مرتفع لملف العميل");
    suggestions.push("تحسين الملف الائتماني قبل الإرسال النهائي للبنك");
  }

  if (risk.factors.length > 0) {
    suggestions.push(...risk.factors);
  }

  return { primary, warnings, suggestions };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { offers, userData } = body;

    const validationError = validateInput(offers, userData);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError.message }, { status: validationError.status });
    }

    const netSalary = asNumber(userData.netSalary, 0);
    const totalMonthlyObligations = asNumber(userData.totalMonthlyObligations, 0);
    const carPrice = asNumber(userData.carPrice, 0);
    const availableIncome = netSalary - totalMonthlyObligations;

    const risk = assessRisk({
      employerSector: userData.employerSector,
      hasCreditDefault: userData.hasCreditDefault,
      hasRealEstateFinance: userData.hasRealEstateFinance,
      availableIncome,
    });

    const analyzedOffers = offers.map((offer) => analyzeOffer(offer, availableIncome, carPrice));
    const recommendations = buildRecommendations(analyzedOffers, risk);

    return NextResponse.json({
      success: true,
      data: {
        userProfile: {
          netSalary,
          totalMonthlyObligations,
          availableIncome: Math.max(0, availableIncome),
          riskLevel: risk.level,
          riskFactors: risk.factors,
        },
        offers: analyzedOffers,
        recommendations,
        summary: {
          totalOffersAnalyzed: analyzedOffers.length,
          affordableOffersCount: analyzedOffers.filter((o) => o.isAffordable).length,
          affordableOffers: analyzedOffers
            .filter((o) => o.isAffordable)
            .slice(0, 5)
            .map((o) => ({
              id: o.id,
              title: o.title,
              downPayment: o.downPayment,
              monthlyPayment: o.monthlyPayment,
            })),
          lowestMonthlyPayment: Math.min(...analyzedOffers.map((o) => o.monthlyPayment)),
          lowestTotalCost: Math.min(...analyzedOffers.map((o) => o.totalCost)),
          highestLastPaymentOffer: [...analyzedOffers]
            .sort((a, b) => b.finalPayment - a.finalPayment)
            .slice(0, 1)
            .map((o) => ({
              id: o.id,
              title: o.title,
              monthlyPayment: o.monthlyPayment,
              downPayment: o.downPayment,
              totalCost: o.totalCost,
              finalPayment: o.finalPayment,
            }))[0] || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in analyze-offers API:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}
