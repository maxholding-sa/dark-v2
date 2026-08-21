import React from "react";
import AddReviewForm from "../_components/AddReviewForm";

export const metadata = {
  title: "إضافة تقييم جديد | Max Motors Admin",
  description: "إضافة تقييم جديد في السوق الخاص بك",
};

const CreateReviewPage = () => {
  return (
    <div className="p-6">
      <AddReviewForm />
    </div>
  );
};

export default CreateReviewPage;
