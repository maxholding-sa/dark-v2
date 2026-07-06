"use server";

import { db } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getBanksSupabase } from "@/lib/supabaseReads";
import { serializeBankRecord } from "@/lib/bank-finance";

export const getBanks = unstable_cache(
  async () => {
    try {
      const banks = await db.bank.findMany({
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: banks.map(serializeBankRecord) };
    } catch (error) {
      console.warn("[getBanks] Prisma failed, using Supabase:", error.message);
      return getBanksSupabase();
    }
  },
  ["home-banks-v3"],
  { revalidate: 3600, tags: ["banks"] }
);
