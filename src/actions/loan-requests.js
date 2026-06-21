// server actions -> basically API calls
// All the loan requests related APIs

"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { serializeLoanRequests } from "@/lib/helper";

// fetch loan requests from db
export async function getLoanRequests(search = "") {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      // check if user exists in db
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    let where = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobileNumber: { contains: search, mode: "insensitive" } },
        { carMake: { contains: search, mode: "insensitive" } },
        { carModel: { contains: search, mode: "insensitive" } },
      ];
    }

    const loanRequests = await db.loanRequest.findMany({
      where,
      include: {
        car: true,
        salaryTransferBank: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: serializeLoanRequests(loanRequests),
    };
  } catch (error) {
    console.error(`Error while getting loan requests from DB ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// update loan request status
export async function updateLoanRequestStatus(id, status) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      // check if user exists in db
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    await db.loanRequest.update({
      where: { id: id },
      data: { status: status },
    });

    revalidatePath("/admin/loan-requests");
    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while updating loan request status ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// delete loan request
export async function deleteLoanRequest(id) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      // check if user exists in db
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    await db.loanRequest.delete({
      where: { id: id },
    });

    revalidatePath("/admin/loan-requests");
    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while deleting loan request ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// export loan requests to Excel
export async function exportLoanRequests(ids = null, search = "") {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      // check if user exists in db
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    let where = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobileNumber: { contains: search, mode: "insensitive" } },
        { carMake: { contains: search, mode: "insensitive" } },
        { carModel: { contains: search, mode: "insensitive" } },
      ];
    }

    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const loanRequests = await db.loanRequest.findMany({
      where,
      include: {
        car: true,
        salaryTransferBank: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for Excel export
    const excelData = loanRequests.map((request) => {
      const offer =
        request.offerSnapshot && typeof request.offerSnapshot === "object"
          ? request.offerSnapshot
          : null;

      return {
      "الاسم الكامل": request.fullName,
      "رقم الهوية": request.idNumber,
      "البريد الإلكتروني": request.email,
      "رقم الجوال": request.mobileNumber,
      "المدينة": request.city,
      "وقت التواصل المفضل": request.time,
      "النوع": request.gender === "male" ? "ذكر" : "أنثى",
      "تاريخ الميلاد": `${request.birthMonth} / ${request.birthYear} هـ`,
      "ماركة السيارة": request.carMake,
      "موديل السيارة": request.carModel,
      "سنة الصنع": request.carYear,
      "فئة السيارة": request.carCategory || "غير محدد",
      "البنك (العرض المختار)": offer?.bankName || request.salaryTransferBank?.name || "غير محدد",
      "مبلغ القرض": request.loanAmount ? parseFloat(request.loanAmount.toString()) : 0,
      "الدفعة الأولى": request.downPayment ? parseFloat(request.downPayment.toString()) : 0,
      "نسبة الدفعة الأولى %": request.downPaymentPct ? parseFloat(request.downPaymentPct.toString()) : "",
      "مدة القرض": request.termMonths
        ? `${request.termMonths} شهر`
        : `${request.loanTerm} سنة`,
      "القسط الشهري": request.monthlyPayment ? parseFloat(request.monthlyPayment.toString()) : "",
      "قسط التمويل (بدون تأمين)": request.baseInstallment
        ? parseFloat(request.baseInstallment.toString())
        : "",
      "التأمين الشهري": request.monthlyInsurance ? parseFloat(request.monthlyInsurance.toString()) : "",
      "نسبة الربح %": request.interestRate ? parseFloat(request.interestRate.toString()) : "",
      "النسبة الفعلية APR %": offer?.apr != null ? parseFloat(offer.apr.toString()) : "",
      "الدفعة الأخيرة": request.finalPayment ? parseFloat(request.finalPayment.toString()) : "",
      "دفعة البالون": request.balloonPayment ? parseFloat(request.balloonPayment.toString()) : "",
      "نسبة البالون %": request.balloonPaymentPct ? parseFloat(request.balloonPaymentPct.toString()) : "",
      "الرسوم الإدارية": request.adminFees ? parseFloat(request.adminFees.toString()) : "",
      "إجمالي التأمين": request.totalInsurance ? parseFloat(request.totalInsurance.toString()) : "",
      "إجمالي الربح": request.totalProfit ? parseFloat(request.totalProfit.toString()) : "",
      "إجمالي التكلفة": request.totalPayment ? parseFloat(request.totalPayment.toString()) : "",
      "فئة التأمين": request.insuranceSegment || "",
      "صافي الراتب": request.netSalary ? parseFloat(request.netSalary.toString()) : "غير محدد",
      "جهة العمل": request.employerSector || "غير محدد",
      "اسم جهة العمل": request.employer || "غير محدد",
      "جهة تحويل الراتب": request.salaryTransferBank?.name || "غير محدد",
      "هل لديك تمويل عقاري": request.hasRealEstateFinance ? "نعم" : "لا",
      "هل لديك تعثر في سمة": request.hasCreditDefault ? "نعم" : "لا",
      "إجمالي الإلتزامات الشهرية": request.totalMonthlyObligations ? parseFloat(request.totalMonthlyObligations.toString()) : "غير محدد",
      "معلومات إضافية": request.additionalInfo || "",
      "الحالة": request.status === "PENDING" ? "معلق" : request.status === "APPROVED" ? "مقبول" : request.status === "REJECTED" ? "مرفوض" : request.status === "COMPLETED" ? "مكتمل" : request.status,
      "تاريخ الطلب": new Date(request.createdAt).toLocaleDateString("ar-SA"),
      "آخر تحديث": new Date(request.updatedAt).toLocaleDateString("ar-SA"),
    };
    });

    return {
      success: true,
      data: excelData,
    };
  } catch (error) {
    console.error(`Error while exporting loan requests ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
