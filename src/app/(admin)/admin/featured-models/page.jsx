import React from "react";
import FeaturedModelList from "./_components/FeaturedModelList";

export const metadata = {
  title: "أنواع الهيكل المميزة | Max Motors Admin",
  description: "إدارة أنواع الهيكل المميزة",
};

const FeaturedModelsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">
        إدارة أنواع الهيكل المميزة
      </h1>
      <FeaturedModelList />
    </div>
  );
};

export default FeaturedModelsPage;
