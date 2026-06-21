"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, Shield, Facebook, Chrome, Music2 } from "lucide-react";
import WorkingHoursCard from "./WorkingHoursCard";
import AdminUsersCard from "./AdminUsersCard";
import PixelTabContent from "./PixelTabContent";

const SettingsForm = () => {
  return (
    <div dir="rtl">
      <Tabs defaultValue="hours">
        <div className="flex justify-end mb-6">
          <TabsList dir="rtl" className="flex flex-wrap h-auto gap-1 bg-black/40 border border-white/10 p-1">
          <TabsTrigger value="hours" className="flex items-center gap-2 px-4">
            <Clock className="h-4 w-4" /> ساعات العمل
          </TabsTrigger>

          <TabsTrigger value="admins" className="flex items-center gap-2 px-4">
            <Shield className="h-4 w-4" /> مستخدمو الإدارة
          </TabsTrigger>

          <TabsTrigger value="facebook" className="flex items-center gap-2 px-4 data-[state=active]:bg-blue-600">
            <Facebook className="h-4 w-4" /> فيسبوك بيكسل
          </TabsTrigger>

          <TabsTrigger value="google" className="flex items-center gap-2 px-4 data-[state=active]:bg-orange-600">
            <Chrome className="h-4 w-4" /> إعدادات جوجل
          </TabsTrigger>

          <TabsTrigger value="social" className="flex items-center gap-2 px-4 data-[state=active]:bg-pink-600">
            <Music2 className="h-4 w-4" /> تيك توك وسناب
          </TabsTrigger>

          <TabsTrigger value="clarity" className="flex items-center gap-2 px-4 data-[state=active]:bg-teal-600">
            <Activity className="h-4 w-4" /> كلايريتي
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="hours" className="space-y-6">
          <WorkingHoursCard />
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          <AdminUsersCard />
        </TabsContent>

        <TabsContent value="facebook" className="space-y-6">
          <PixelTabContent type="facebook" />
        </TabsContent>

        <TabsContent value="google" className="space-y-6">
          <PixelTabContent type="google" />
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <PixelTabContent type="social" />
        </TabsContent>

        <TabsContent value="clarity" className="space-y-6">
          <PixelTabContent type="clarity" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsForm;
