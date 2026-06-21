"use client";

import React, { useEffect, useState } from "react";
import { getAboutPage } from "@/actions/site-management";
import AboutPageForm from "./_components/AboutPageForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingBar from "@/components/LoadingBar";

const AboutPageManagementPage = () => {
  const [aboutPage, setAboutPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutPage();
  }, []);

  const fetchAboutPage = async () => {
    setLoading(true);
    const result = await getAboutPage({ forAdmin: true });
    if (result.success) {
      setAboutPage(result.data);
    }
    setLoading(false);
  };

  const handleFormSubmit = () => {
    fetchAboutPage();
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">صفحة من نحن</h1>
        <p className="text-gray-600 mt-2">إدارة محتوى صفحة من نحن والرؤية والرسالة والمميزات</p>
      </div>

      {loading ? (
        <LoadingBar fullScreen={false} className="py-20" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>محتوى الصفحة</CardTitle>
            <CardDescription>قم بتحديث محتوى صفحة عن المتجر</CardDescription>
          </CardHeader>
          <CardContent>
            <AboutPageForm aboutPage={aboutPage} onSubmit={handleFormSubmit} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AboutPageManagementPage;
