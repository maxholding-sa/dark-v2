import React from "react";
import Link from "next/link";
import BankCard from "@/components/BankCard";
import { getBanks } from "@/actions/banks";
import { generateMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Banknote } from "lucide-react";

export const metadata = generateMetadata({
  title: "العروض التمويلية للسيارات",
  description: "قارن عروض التمويل البنكي المتاحة لشراء سيارتك من ماكس موتورز واختر العرض المناسب لك في السعودية.",
  keywords: ["تمويل سيارات", "عروض بنكية للسيارات", "قرض سيارة", "تقسيط سيارات"],
  canonicalUrl: "/banks",
});

export default async function BanksPage() {
  const banksRes = await getBanks();
  const banks = banksRes?.data || [];

  return (
    <div className="pt-20 pb-12 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        <section className="py-12 px-6 md:px-12">
          <div className="container mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              العروض التمويلية
            </h1>
            <p className="text-yellow-600 text-base max-w-2xl mx-auto mb-6">
              اكتشف جميع العروض التمويلية المتاحة لتمويل سيارتك
            </p>
            <Button
              asChild
              className="bg-yellow-700 hover:bg-yellow-800 text-white font-bold"
            >
              <Link
                href="/loan-request"
                className="inline-flex items-center gap-2"
              >
                <Banknote className="h-4 w-4" />
                طلب قرض مباشرة
              </Link>
            </Button>
          </div>
        </section>

        {banks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-gray-300">
            لا توجد بنوك متاحة حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {banks.map((bank) => (
              <div key={bank.id} className="h-full w-full">
                <BankCard bank={bank} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
