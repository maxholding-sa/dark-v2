import React from "react";
import AddCarForm from "../_components/AddCarForm";

export const metadata = {
  title: "إضافة سيارة جديدة | Max Motors Admin",
  description: "إضافة سيارة جديدة إلى السوق",
};

const AddCarPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">إضافة سيارة جديدة</h1>
      <AddCarForm />
    </div>
  );
};

export default AddCarPage;
