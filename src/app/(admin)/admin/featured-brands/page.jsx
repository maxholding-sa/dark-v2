import React from "react";
import FeaturedBrandList from "./_components/FeaturedBrandList";

export const metadata = {
  title: "العلامات التجارية المميزة | Max Motors Admin",
  description: "إدارة العلامات التجارية المميزة",
};

const FeaturedBrandsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">
        إدارة العلامات التجارية المميزة
      </h1>
      <FeaturedBrandList />
    </div>
  );
};

export default FeaturedBrandsPage;
