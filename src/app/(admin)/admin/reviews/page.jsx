import React from "react";
import ReviewList from "./_components/ReviewList";

export const metadata = {
  title: "التقييمات | Max Motors Admin",
  description: "إدارة التقييمات في السوق الخاص بك",
};

const ReviewsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-right">إدارة التقييمات</h1>
      <ReviewList />
    </div>
  );
};

export default ReviewsPage;
