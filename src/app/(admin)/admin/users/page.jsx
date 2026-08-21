import { getAdmin } from "@/actions/admin";
import { notFound } from "next/navigation";
import React from "react";
import PagePermissionsMatrix from "./_components/PagePermissionsMatrix";

export const metadata = {
    title: "إدارة الصفحات المسموحة والممنوعة | Max Motors Admin",
    description: "تحكم في وصول المحررين لصفحات لوحة التحكم",
};

const UsersPage = async () => {
    const { user } = await getAdmin();

    if (user?.role !== "ADMIN") {
        return notFound();
    }

    return (
        <div className="p-6" dir="rtl">
            <div className="flex flex-col gap-2 mb-6 text-right">
                <h1 className="text-3xl font-bold text-white">تحكم وصول الصفحات</h1>
                <p className="text-gray-400">تحكم بمن يمكنه رؤية كل صفحة من صفحات النظام ومن سيتم منعه منها</p>
            </div>

            <PagePermissionsMatrix />
        </div>
    );
};

export default UsersPage;
