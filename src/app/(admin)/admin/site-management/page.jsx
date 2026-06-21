import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "إدارة الموقع | Click Car Admin",
  description: "إدارة البيانات الأساسية للموقع",
};

const SiteManagementPage = () => {
  const managementItems = [
    {
      title: "وسائل التواصل الاجتماعي",
      description: "إدارة روابط وسائل التواصل الاجتماعي",
      href: "/admin/site-management/social-media",
      icon: "📱",
    },
    {
      title: "معلومات المتجر",
      description: "إدارة معلومات موقع المتجر والعنوان",
      href: "/admin/site-management/store-info",
      icon: "🏪",
    },
    {
      title: "الشعار (اللوجو)",
      description: "إدارة شعار الموقع والصور",
      href: "/admin/site-management/logo",
      icon: "🖼️",
    },
    {
      title: "صفحة من نحن",
      description: "إدارة محتوى الرؤية والرسالة والمميزات والصور",
      href: "/admin/site-management/about-page",
      icon: "📄",
    },
  ];

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-3xl font-bold mb-2 text-right">إدارة الموقع</h1>
      <p className="text-gray-600 mb-8 text-right">إدارة محتوى وبيانات الموقع الأساسية</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {managementItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-right">{item.title}</CardTitle>
                    <CardDescription className="text-right mt-2">
                      {item.description}
                    </CardDescription>
                  </div>
                  <div className="text-4xl ml-4">{item.icon}</div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  إدارة →
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SiteManagementPage;
