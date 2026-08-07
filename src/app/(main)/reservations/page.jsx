import { getUserTestDrives } from "@/actions/test-drive";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import ReservationsList from "./_components/ReservationsList";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "حجوزاتي",
  description: "إدارة حجوزات اختبار القيادة الخاصة بك",
  robots: NOINDEX_ROBOTS,
};

const ReservationsPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect=/reservations");
  }

  const reservationsResult = await getUserTestDrives();

  return (
    <div className="w-full px-0 py-12">
      <h1 className="text-2xl md:text-4xl mb-6 gradient-title">حجوزاتك</h1>{" "}
      <ReservationsList initialData={reservationsResult} />
    </div>
  );
};

export default ReservationsPage;
