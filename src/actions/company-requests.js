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
