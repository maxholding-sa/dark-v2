import React from "react";
import { serializeBankRecord } from "@/lib/bank-finance";

export const serializedCarsData = (car, wishlisted = false) => {
  if (!car) return null;
  return {
    ...car,
    price: car.price ? parseFloat(car.price.toString()) : 0,
    createdAt: car.createdAt?.toISOString ? car.createdAt.toISOString() : car.createdAt,
    updatedAt: car.updatedAt?.toISOString ? car.updatedAt.toISOString() : car.updatedAt,
    wishliseted: wishlisted,
  };
};

export const serializeLoanRequest = (request) => {
  if (!request) return null;
  const decimal = (value) => (value != null ? parseFloat(value.toString()) : null);
  return {
    ...request,
    loanAmount: decimal(request.loanAmount) ?? 0,
    downPayment: decimal(request.downPayment) ?? 0,
    downPaymentPct: decimal(request.downPaymentPct),
    monthlyPayment: decimal(request.monthlyPayment),
    baseInstallment: decimal(request.baseInstallment),
    monthlyInsurance: decimal(request.monthlyInsurance),
    interestRate: decimal(request.interestRate),
    finalPayment: decimal(request.finalPayment),
    balloonPayment: decimal(request.balloonPayment),
    balloonPaymentPct: decimal(request.balloonPaymentPct),
    adminFees: decimal(request.adminFees),
    totalInsurance: decimal(request.totalInsurance),
    totalProfit: decimal(request.totalProfit),
    totalPayment: decimal(request.totalPayment),
    netSalary: decimal(request.netSalary),
    totalMonthlyObligations: decimal(request.totalMonthlyObligations),
    createdAt: request.createdAt?.toISOString ? request.createdAt.toISOString() : request.createdAt,
    updatedAt: request.updatedAt?.toISOString ? request.updatedAt.toISOString() : request.updatedAt,
    car: request.car ? serializedCarsData(request.car) : null,
    salaryTransferBank: request.salaryTransferBank
      ? serializeBankRecord(request.salaryTransferBank)
      : null,
  };
};

export const serializeLoanRequests = (requests) => {
  if (!requests) return [];
  return requests.map(serializeLoanRequest);
};

export const formatSaudiRiyalReact = (amount) => {
  const value = Number(amount) || 0;

  // You can switch to "ar-SA" if you want Arabic digits
  const formattedNumber = new Intl.NumberFormat("en-EN").format(value);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      {/* Number first */}
      <span>{formattedNumber}</span>

      {/* Icon after */}
      <span className="icon-saudi_riyal" aria-hidden="true">
        &#xea;
      </span>
    </span>
  );
};

export const formatSaudiRiyalText = (amount) => {
  const value = Number(amount) || 0;
  const formattedNumber = new Intl.NumberFormat("en-EN").format(value);
  return `${formattedNumber} ريال سعودي`;
};

const HIJRI_MONTH_NAMES = {
  "1": "محرم",
  "2": "صفر",
  "3": "ربيع الأول",
  "4": "ربيع الآخر",
  "5": "جمادى الأولى",
  "6": "جمادى الآخرة",
  "7": "رجب",
  "8": "شعبان",
  "9": "رمضان",
  "10": "شوال",
  "11": "ذو القعدة",
  "12": "ذو الحجة",
};

export const formatHijriBirthMonth = (month) =>
  HIJRI_MONTH_NAMES[String(month)] || month || "غير محدد";

const GREGORIAN_MONTH_NAMES = {
  "1": "يناير",
  "2": "فبراير",
  "3": "مارس",
  "4": "أبريل",
  "5": "مايو",
  "6": "يونيو",
  "7": "يوليو",
  "8": "أغسطس",
  "9": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

export const formatGregorianBirthMonth = (month) =>
  GREGORIAN_MONTH_NAMES[String(month)] || month || "غير محدد";

export const formatBirthDate = (birthMonth, birthYear, birthDateType) => {
  if (birthDateType === "gregorian") {
    return `${formatGregorianBirthMonth(birthMonth)} / ${birthYear} م`;
  }
  return `${formatHijriBirthMonth(birthMonth)} / ${birthYear} هـ`;
};

export const formatYesNo = (value) => {
  if (value === true || value === "yes") return "نعم";
  if (value === false || value === "no") return "لا";
  return "غير محدد";
};

export const formatGenderAr = (gender) => {
  if (gender === "male") return "ذكر";
  if (gender === "female") return "أنثى";
  return gender || "غير محدد";
};

export const formatLoanRequestStatusAr = (status) => {
  switch (status) {
    case "PENDING":
      return "معلق";
    case "APPROVED":
      return "مقبول";
    case "REJECTED":
      return "مرفوض";
    case "COMPLETED":
      return "مكتمل";
    default:
      return status || "غير محدد";
  }
};

export const formatPercent = (value, digits = 2) => {
  if (value == null || value === "") return "غير محدد";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(digits)}%` : "غير محدد";
};
