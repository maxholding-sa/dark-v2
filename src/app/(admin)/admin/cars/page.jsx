import React from "react";
import CarList from "./_components/CarList";

export const metadata = {
  title: "السيارات | Max Motors Admin",
  description: "إدارة السيارات في السوق الخاص بك",
};

const CarsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">إدارة السيارات</h1>
      <CarList />
    </div>
  );
};

export default CarsPage;
