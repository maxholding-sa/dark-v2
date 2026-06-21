import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

const toFloat = (value) => {
  if (value == null || value === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const toInt = (value) => {
  if (value == null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      mobileNumber,
      city,
      time,
      idNumber,
      idImage,
      carMake,
      carModel,
      carCategory,
      carYear,
      birthMonth,
      birthYear,
      gender,
      loanAmount,
      downPayment,
      loanTerm,
      monthlyPayment,
      interestRate,
      finalPayment,
      termMonths,
      downPaymentPct,
      baseInstallment,
      monthlyInsurance,
      balloonPayment,
      balloonPaymentPct,
      adminFees,
      totalInsurance,
      totalProfit,
      totalPayment,
      insuranceSegment,
      offerSnapshot,
      selectedOffer,
      netSalary,
      employerSector,
      employer,
      salaryTransferBank,
      hasRealEstateFinance,
      hasCreditDefault,
      totalMonthlyObligations,
      additionalInfo,
      carId,
    } = body;

    const offer = selectedOffer && typeof selectedOffer === "object" ? selectedOffer : {};

    if (
      !fullName ||
      !email ||
      !mobileNumber ||
      !city ||
      !time ||
      !idNumber ||
      !carMake ||
      !carModel ||
      !carYear ||
      !birthMonth ||
      !birthYear ||
      !gender ||
      !loanAmount ||
      !downPayment ||
      !loanTerm ||
      !carId
    ) {
      return NextResponse.json(
        { success: false, message: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    const loanRequest = await db.loanRequest.create({
      data: {
        fullName,
        email,
        mobileNumber,
        city,
        time,
        idNumber,
        idImage: idImage || null,
        carMake,
        carModel,
        carCategory: carCategory || null,
        carYear: parseInt(carYear, 10),
        birthMonth,
        birthYear,
        gender,
        loanAmount: parseFloat(loanAmount),
        downPayment: parseFloat(downPayment),
        loanTerm: parseInt(loanTerm, 10),
        termMonths: toInt(offer.termMonths ?? termMonths),
        downPaymentPct: toFloat(offer.downPaymentPct ?? downPaymentPct),
        monthlyPayment: toFloat(offer.monthlyPayment ?? monthlyPayment),
        baseInstallment: toFloat(offer.baseInstallment ?? baseInstallment),
        monthlyInsurance: toFloat(offer.monthlyInsurance ?? monthlyInsurance),
        interestRate: toFloat(offer.interestRate ?? interestRate),
        finalPayment: toFloat(offer.lastMonthPayment ?? offer.finalPayment ?? finalPayment),
        balloonPayment: toFloat(offer.balloonPayment ?? balloonPayment),
        balloonPaymentPct: toFloat(offer.balloonPaymentPct ?? balloonPaymentPct),
        adminFees: toFloat(offer.adminFees ?? adminFees),
        totalInsurance: toFloat(offer.totalInsurance ?? totalInsurance),
        totalProfit: toFloat(offer.totalProfit ?? totalProfit),
        totalPayment: toFloat(offer.totalPayment ?? totalPayment),
        insuranceSegment: offer.insuranceSegment ?? insuranceSegment ?? null,
        offerSnapshot: offerSnapshot ?? (Object.keys(offer).length ? offer : null),
        netSalary: netSalary ? parseFloat(netSalary) : null,
        employerSector: employerSector || null,
        employer: employer || null,
        salaryTransferBankId: salaryTransferBank || null,
        hasRealEstateFinance: hasRealEstateFinance === "yes",
        hasCreditDefault: hasCreditDefault === "yes",
        totalMonthlyObligations: totalMonthlyObligations
          ? parseFloat(totalMonthlyObligations)
          : null,
        additionalInfo: additionalInfo || null,
        carId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إرسال طلب القرض بنجاح",
      data: {
        id: loanRequest.id,
        status: loanRequest.status,
      },
    });
  } catch (error) {
    console.error("Error creating loan request:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ في معالجة الطلب" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405 }
  );
}
