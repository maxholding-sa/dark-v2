import { getAdmin } from "@/actions/admin";
import { notFound } from "next/navigation";
import React from "react";
import SettingsForm from "./_components/SettingsForm";

export const metadata = {
  title: "الإعدادات | Max Motors Admin",
  description: "إدارة ساعات العمل ومستخدمي الإدارة",
};

const SettingsPage = async () => {
  const { user } = await getAdmin();

  if (user?.role !== "ADMIN") {
    return notFound();
  }

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 text-right">الإعدادات</h1>
      <SettingsForm />
    </div>
  );
};

export default SettingsPage;
