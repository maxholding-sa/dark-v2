import React from "react";
import TestDriveList from "./_components/TestDriveList";

export const metadata = {
  title: "اختبارات القيادة | Max Motors Admin",
  description: "إدارة حجوزات اختبار القيادة",
};

const TestDrivePage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">إدارة اختبارات القيادة</h1>
      <TestDriveList />
    </div>
  );
};

export default TestDrivePage;
