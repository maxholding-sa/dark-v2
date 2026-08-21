import React from "react";
import EditReviewForm from "../../_components/EditReviewForm";

export const metadata = {
  title: "تعديل التقييم | Max Motors Admin",
  description: "تعديل تقييم موجود في السوق الخاص بك",
};

const EditReviewPage = async ({ params }) => {
  const { id } = await params;
  return (
    <div className="p-6">
      <EditReviewForm reviewId={id} />
    </div>
  );
};

export default EditReviewPage;
