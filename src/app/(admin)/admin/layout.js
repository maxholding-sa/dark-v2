import { getAdmin } from "@/actions/admin";
import Header from "@/components/header";
import { notFound } from "next/navigation";
import React from "react";
import Sidebar from "./_components/Sidebar";
import PermissionGuard from "./_components/PermissionGuard";
import { getLogoByType, getAboutPage } from "@/actions/site-management";

export const dynamic = 'force-dynamic';

const AdminLayout = async ({ children }) => {
  const [admin, navLogoRes, aboutPageRes] = await Promise.all([
    getAdmin(),
    getLogoByType("navbar"),
    getAboutPage({ forAdmin: true }),
  ]);

  if (!admin.authorized) {
    return notFound(); //not found page
  }

  const navLogo = navLogoRes?.data;
  const aboutNavLabel = aboutPageRes?.data?.title || "من نحن";

  return (
    <div className="h-full">
      {/* Overlapping header page here to avoid making it a client component */}
      <Header isAdminPage={true} navLogo={navLogo} aboutNavLabel={aboutNavLabel} />

      <div className="w-56 fixed top-20 bottom-0 z-50 right-0 flex flex-col">
        <Sidebar user={admin.user} />
      </div>
      <main className="md:pr-56 pt-[80px] h-full">
        <PermissionGuard user={admin.user}>
          {children}
        </PermissionGuard>
      </main>
    </div>
  );
};

export default AdminLayout;
