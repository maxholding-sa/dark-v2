"use client";
import { cn } from "@/lib/utils";
import { Calendar, Car, Cog, Heart, LayoutDashboard, MessageSquare, Award, Home, FileText, Mail, DollarSign, Settings2, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const routes = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard, href: "/admin" },
  { id: "cars", label: "السيارات", icon: Car, href: "/admin/cars" },
  { id: "brands", label: "العلامات التجارية", icon: Award, href: "/admin/featured-brands" },
  { id: "models", label: "الموديلات المميزة", icon: Award, href: "/admin/featured-models" },
  { id: "test-drives", label: "اختبارات القيادة", icon: Calendar, href: "/admin/test-drives" },
  { id: "chat-analytics", label: "تحليلات الدردشة", icon: MessageSquare, href: "/admin/chat-analytics" },
  { id: "loan-requests", label: "طلبات القروض", icon: DollarSign, href: "/admin/loan-requests" },
  { id: "site-data", label: "إدارة بيانات الموقع", icon: Settings2, href: "/admin/site-data" },
  { id: "settings", label: "الإعدادات", icon: Cog, href: "/admin/settings", isAdminOnly: true },
  { id: "bank", label: "البنك", icon: Home, href: "/admin/bank" },
  { id: "articles", label: "المقالات", icon: FileText, href: "/admin/articles" },
  { id: "reviews", label: "التقييمات", icon: MessageSquare, href: "/admin/reviews" },
  { id: "contacts", label: "الرسائل", icon: Mail, href: "/admin/contacts" },
  { id: "mandebs", label: "المناديب", icon: Users, href: "/admin/mandebs" },
  { id: "company-requests", label: "طلبات الشركات", icon: Building2, href: "/admin/company-requests" },
];

const Sidebar = ({ user }) => {
  const pathName = usePathname();

  const filteredRoutes = routes.filter((route) => {
    if (user?.role === "ADMIN") return true;
    if (user?.role === "EDITOR") {
      // Don't show admin-only routes to editors even if they somehow have permission
      if (route.isAdminOnly) return false;
      return user.permissions?.includes(route.id);
    }
    return false;
  });

  return (
    <>
      {/* Sidebar for bigger screens */}
      <div className="hidden md:flex h-full flex-col overflow-y-auto bg-black shadow-sm border-r border-gray-800 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredRoutes.map((route) => {
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-x-2 text-gray-300 text-sm font-medium pl-6 transition-all hover:text-white hover:bg-gray-900 h-12 pr-4",
                pathName === route.href
                  ? "text-white bg-gray-800 hover:bg-gray-800 hover:text-white"
                  : ""
              )}
            >
              <route.icon className="h-5 w-5" />
              {route.label}
            </Link>
          );
        })}
      </div>
      {/* Footer type sidebar for smaller screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 flex justify-around items-center h-16 overflow-x-auto">
        {filteredRoutes.map((route) => {
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center text-gray-300 text-xs font-medium transition-all hover:text-white hover:bg-gray-900 h-12 py-1 flex-1 min-w-[70px]",
                pathName === route.href ? "text-white" : ""
              )}
            >
              <route.icon className="h-5 w-5" />
              <span className="mt-1 whitespace-nowrap">{route.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default Sidebar;
