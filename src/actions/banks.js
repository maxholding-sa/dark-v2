"use server";

import { db } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getBanksSupabase } from "@/lib/supabaseReads";

export const getBanks = unstable_cache(
  async () => {
    try {
      const banks = await db.bank.findMany({
        orderBy: { createdAt: "desc" },
      });

      const serializedBanks = banks.map((bank) => ({
        ...bank,
        interestRate: bank.interestRate ? parseFloat(bank.interestRate.toString()) : 0,
        createdAt: bank.createdAt instanceof Date ? bank.createdAt.toISOString() : bank.createdAt,
        updatedAt: bank.updatedAt instanceof Date ? bank.updatedAt.toISOString() : bank.updatedAt,
      }));

      return { success: true, data: serializedBanks };
    } catch (error) {
      console.warn("[getBanks] Prisma failed, using Supabase:", error.message);
      return getBanksSupabase();
    }
  },
  ["home-banks-v2"],
  { revalidate: 3600, tags: ["banks"] }
);
