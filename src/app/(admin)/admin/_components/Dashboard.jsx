"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import OverviewTab from "./OverviewTab";
import TestDriveTab from "./TestDriveTab";
import LoanRequestsTab from "./LoanRequestsTab";
import AnalyticsTab from "./AnalyticsTab";

const Dashboard = ({ initialData }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!initialData || !initialData.success || !initialData.data) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          {initialData?.error?.message || initialData?.error || "ليس لديك صلاحية للوصول إلى هذه الصفحة أو فشل تحميل البيانات"}
        </AlertDescription>
      </Alert>
    );
  }

  const { cars, testDrives, loanRequests, analytics } = initialData.data;

  return (
    <div>
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="flex justify-end mb-2">
          <TabsList dir="rtl">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="testDrives">اختبارات القيادة</TabsTrigger>
            <TabsTrigger value="loanRequests">طلبات القروض</TabsTrigger>
            <TabsTrigger value="analytics">تحليلات</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab cars={cars} testDrives={testDrives} />
        </TabsContent>

        <TabsContent value="testDrives">
          <TestDriveTab testDrives={testDrives} />
        </TabsContent>

        <TabsContent value="loanRequests">
          <LoanRequestsTab loanRequests={loanRequests} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
