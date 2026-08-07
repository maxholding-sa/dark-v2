import { getCarById } from "@/actions/car-details";
import { notFound } from "next/navigation";
import React from "react";
import TestDriveForm from "./_components/TestDriveForm";
import { generateMetadata as buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;

  return buildMetadata({
    title: "احجز تجربة قيادة",
    description: "حدد موعد اختبار قيادة في ثوانٍ",
    canonicalUrl: `/test-drive/${id}`,
    robots: {
      index: false,
      follow: false,
    },
  });
}

const TestDrivePage = async ({ params }) => {
  const { id } = await params;
  const result = await getCarById(id);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl mb-6 gradient-title">احجز اختبار قيادة</h1>
      <TestDriveForm
        car={result?.data}
        testDriveInfo={result.data.testDriveInfo}
      />
    </div>
  );
};

export default TestDrivePage;
