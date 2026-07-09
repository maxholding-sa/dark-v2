import { getSavedCars } from "@/actions/car-listing";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import { SavedCarsList } from "./_components/SavedCarsList";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "السيارات المحفوظة | ماكس موتورز",
  description: "قائمة السيارات التي حفظتها في حسابك على ماكس موتورز.",
  robots: NOINDEX_ROBOTS,
};

const SavedCarsPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect=/saved-cars");
  }

  const savedCarsResult = await getSavedCars();

  return (
    <div className="w-full px-0 py-12">
      <h1 className="text-2xl md:text-4xl mb-6 gradient-title">سياراتك المحفوظة</h1>
      <SavedCarsList initialData={savedCarsResult} />
    </div>
  );
};

export default SavedCarsPage;
