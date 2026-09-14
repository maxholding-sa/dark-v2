"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/permissions";

// ─── Admin: Get all company requests ─────────────────────────────────────────
export async function getCompanyRequests({ status } = {}) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const hasPermission = await checkPermission(userId, "company-requests");
        if (!hasPermission) throw new Error("Unauthorized access");

        const where = status ? { status } : {};

        const requests = await db.companyRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            data: requests,
        };
    } catch (error) {
        console.error("Error in getCompanyRequests:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Public: Create a new company request (no auth required) ─────────────────
export async function createCompanyRequest(data) {
    try {
        if (!data.companyName?.trim()) {
            throw new Error("اسم الشركة مطلوب");
        }

        const request = await db.companyRequest.create({
            data: {
                companyName: data.companyName.trim(),
                contactPerson: data.contactPerson?.trim() || null,
                phone: data.phone?.trim() || null,
                notes: data.notes?.trim() || null,
                status: "PENDING",
            },
        });

        revalidatePath("/admin/company-requests");

        return {
            success: true,
            data: request,
        };
    } catch (error) {
        console.error("Error in createCompanyRequest:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Admin: Update company request status ─────────────────────────────────────
export async function updateCompanyRequestStatus(id, status) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const hasPermission = await checkPermission(userId, "company-requests");
        if (!hasPermission) throw new Error("Unauthorized access");

        const request = await db.companyRequest.update({
            where: { id },
            data: { status },
        });

        revalidatePath("/admin/company-requests");

        return {
            success: true,
            data: request,
        };
    } catch (error) {
        console.error("Error in updateCompanyRequestStatus:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Admin: Delete company request ────────────────────────────────────────────
export async function deleteCompanyRequest(id) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const hasPermission = await checkPermission(userId, "company-requests");
        if (!hasPermission) throw new Error("Unauthorized access");

        await db.companyRequest.delete({
            where: { id },
        });

        revalidatePath("/admin/company-requests");

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error in deleteCompanyRequest:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

const MAX_BULK_DELETE = 200;

const STATUS_LABELS = {
    PENDING: "قيد الانتظار",
    REVIEWED: "تمت المراجعة",
    COMPLETED: "مكتمل",
};

async function requireCompanyRequestAccess() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "company-requests");
    if (!hasPermission) throw new Error("Unauthorized access");

    return userId;
}

// ─── Admin: Bulk delete company requests ──────────────────────────────────────
export async function deleteCompanyRequests(ids = []) {
    try {
        await requireCompanyRequestAccess();

        const uniqueIds = [
            ...new Set(
                (Array.isArray(ids) ? ids : [])
                    .map((id) => String(id || "").trim())
                    .filter(Boolean)
            ),
        ];

        if (uniqueIds.length === 0) {
            return { success: false, error: "لم يتم اختيار أي طلب للحذف" };
        }
        if (uniqueIds.length > MAX_BULK_DELETE) {
            return {
                success: false,
                error: `لا يمكن حذف أكثر من ${MAX_BULK_DELETE} طلب في المرة الواحدة`,
            };
        }

        const { count } = await db.companyRequest.deleteMany({
            where: { id: { in: uniqueIds } },
        });

        revalidatePath("/admin/company-requests");
        return {
            success: true,
            count,
            requested: uniqueIds.length,
        };
    } catch (error) {
        console.error("Error in deleteCompanyRequests:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Admin: Bulk update company request status ────────────────────────────────
export async function updateCompanyRequestsStatus(ids = [], status) {
    try {
        await requireCompanyRequestAccess();

        if (!["PENDING", "REVIEWED", "COMPLETED"].includes(status)) {
            return { success: false, error: "حالة غير صالحة" };
        }

        const uniqueIds = [
            ...new Set(
                (Array.isArray(ids) ? ids : [])
                    .map((id) => String(id || "").trim())
                    .filter(Boolean)
            ),
        ];

        if (uniqueIds.length === 0) {
            return { success: false, error: "لم يتم اختيار أي طلب للتحديث" };
        }

        const { count } = await db.companyRequest.updateMany({
            where: { id: { in: uniqueIds } },
            data: { status },
        });

        revalidatePath("/admin/company-requests");
        return {
            success: true,
            count,
            requested: uniqueIds.length,
        };
    } catch (error) {
        console.error("Error in updateCompanyRequestsStatus:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ─── Admin: Export company requests to Excel ──────────────────────────────────
export async function exportCompanyRequests(ids = null) {
    try {
        await requireCompanyRequestAccess();

        const where =
            ids && ids.length > 0
                ? { id: { in: ids } }
                : {};

        const requests = await db.companyRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        const excelData = requests.map((request) => ({
            "اسم الشركة": request.companyName,
            "اسم المسؤول": request.contactPerson || "",
            "رقم الجوال": request.phone || "",
            "تفاصيل الطلب": request.notes || "",
            "الحالة": STATUS_LABELS[request.status] || request.status,
            "تاريخ الطلب": new Date(request.createdAt).toLocaleString("ar-SA"),
        }));

        return {
            success: true,
            data: excelData,
        };
    } catch (error) {
        console.error("Error in exportCompanyRequests:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}
