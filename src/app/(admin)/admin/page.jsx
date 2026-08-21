import { getDashboardData, getAdmin } from "@/actions/admin";
import { ADMIN_ROUTES } from "@/constants/admin-routes";
import { redirect } from "next/navigation";
import React from "react";
import Dashboard from "./_components/Dashboard";

export const metadata = {
  title: "لوحة التحكم | Max Motors Admin",
  description: "لوحة تحكم المسؤول لموقع ماكس موتورز",
};

const AdminPage = async () => {
  const admin = await getAdmin();
  const user = admin.user;

  // Server-side permission check for Editor
  if (user?.role === "EDITOR") {
    const hasDashboardAccess = user.permissions?.includes("dashboard");
    if (!hasDashboardAccess) {
      const firstAllowed = ADMIN_ROUTES.find(r => user.permissions?.includes(r.id));
      if (firstAllowed) {
        return redirect(firstAllowed.href);
      }
      return redirect("/"); // No permissions
    }
  }

  const dashboardData = await getDashboardData();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">لوحة التحكم</h1>
      <Dashboard initialData={dashboardData} />
    </div>
  );
};

export default AdminPage;
