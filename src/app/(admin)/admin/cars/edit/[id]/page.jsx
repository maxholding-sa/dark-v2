import React from "react";
import EditCarForm from "../../_components/EditCarForm";

export const metadata = {
  title: "تعديل السيارة | Max Motors Admin",
  description: "تعديل تفاصيل السيارة",
};

const EditCarPage = async ({ params }) => {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">تعديل السيارة</h1>
      <EditCarForm carId={id} />
    </div>
  );
};

export default EditCarPage;
