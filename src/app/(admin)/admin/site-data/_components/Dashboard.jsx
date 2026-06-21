"use client";

import React, { useEffect, useState } from "react";
import {
  getSocialMediaLinks,
  getStoreInfo,
  getLogos,
  getAboutPage,
  getHeroSection,
} from "@/actions/site-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle } from "lucide-react";
import SocialMediaManager from "./SocialMediaManager";
import StoreInfoManager from "./StoreInfoManager";
import LogoManager from "./LogoManager";
import AboutPageManager from "./AboutPageManager";
import HeroSectionManager from "./HeroSectionManager";
import PixelSettingsCard from "./PixelSettingsCard";
import DealershipInfoManager from "./DealershipInfoManager";

const SiteDataDashboard = () => {
  const [data, setData] = useState({
    socialMedia: [],
    storeInfo: null,
    logos: [],
    aboutPage: null,
    heroSection: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("social-media");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [socialResult, storeResult, logosResult, aboutResult, heroResult] = await Promise.all([
        getSocialMediaLinks(),
        getStoreInfo(),
        getLogos(),
        getAboutPage({ forAdmin: true }),
        getHeroSection(),
      ]);

      const failedLoads = [];
      if (!socialResult.success) failedLoads.push(`وسائل التواصل: ${socialResult.error || "خطأ غير معروف"}`);
      if (!storeResult.success) failedLoads.push(`بيانات المتجر: ${storeResult.error || "خطأ غير معروف"}`);
      if (!logosResult.success) failedLoads.push(`الشعارات: ${logosResult.error || "خطأ غير معروف"}`);
      if (!aboutResult.success) failedLoads.push(`صفحة من نحن: ${aboutResult.error || "خطأ غير معروف"}`);
      if (!heroResult.success) failedLoads.push(`قسم البطل: ${heroResult.error || "خطأ غير معروف"}`);

      setData({
        socialMedia: socialResult.success ? socialResult.data : [],
        storeInfo: storeResult.success ? storeResult.data : null,
        logos: logosResult.success ? logosResult.data : [],
        aboutPage: aboutResult.success ? aboutResult.data : null,
        heroSection: heroResult.success ? heroResult.data : null,
      });

      if (failedLoads.length > 0) {
        setError(
          failedLoads.length === 5
            ? "فشل تحميل البيانات"
            : `تعذر تحميل بعض البيانات: ${failedLoads.join(" | ")}`
        );
      }
    } catch (err) {
      setError("خطأ في الاتصال: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-right mb-2">لوحة التحكم - إدارة الموقع</h1>
        <p className="text-gray-600 text-right">إدارة البيانات الأساسية للموقع والمتجر</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadAllData}>
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-right">
              وسائل التواصل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {data.socialMedia.filter((s) => s.isActive).length}
            </div>
            <p className="text-xs text-gray-500 text-right">
              {data.socialMedia.length} إجمالي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-right">
              بيانات المتجر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {data.storeInfo ? "✓" : "✗"}
            </div>
            <p className="text-xs text-gray-500 text-right">
              {data.storeInfo?.name || "لم يتم التعيين"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-right">
              الشعارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {data.logos.filter((l) => l.isActive).length}
            </div>
            <p className="text-xs text-gray-500 text-right">
              {data.logos.length} إجمالي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-right">
              صفحة من نحن
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {data.aboutPage?.isPublished ? "منشورة" : "مسودة"}
            </div>
            <p className="text-xs text-gray-500 text-right">
              {data.aboutPage?.features?.length || 0} ميزة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-right">
              قسم البطل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {data.heroSection?.isActive ? "نشط" : "معطل"}
            </div>
            <p className="text-xs text-gray-500 text-right">
              {data.heroSection?.title || "لم يتم التعيين"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-4">
        <TabsList className="inline-flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="about-page">صفحة من نحن</TabsTrigger>
          <TabsTrigger value="hero-section">قسم البطل</TabsTrigger>
          <TabsTrigger value="logos">الشعارات</TabsTrigger>
          <TabsTrigger value="dealership-info">موقع المعرض</TabsTrigger>
          <TabsTrigger value="store-info">بيانات المتجر</TabsTrigger>
          <TabsTrigger value="social-media">وسائل التواصل</TabsTrigger>
          <TabsTrigger value="pixels">البيكسل والتحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="social-media">
          <SocialMediaManager
            data={data.socialMedia}
            onRefresh={loadAllData}
          />
        </TabsContent>

        <TabsContent value="store-info">
          <StoreInfoManager data={data.storeInfo} onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="dealership-info">
          <DealershipInfoManager onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="logos">
          <LogoManager data={data.logos} onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="about-page">
          <AboutPageManager data={data.aboutPage} onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="hero-section">
          <HeroSectionManager initialData={data.heroSection} onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="pixels">
          <PixelSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteDataDashboard;
