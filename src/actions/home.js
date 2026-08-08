"use server";

import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { generateContentResilient } from "@/lib/gemini";

// Function to convert File to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

import { unstable_cache } from "next/cache";
import { carDisplayPriorityOrderBy } from "@/lib/data";
import { getFeaturedCarsSupabase, getHomeCarsByQuerySupabase, getSupabasePublic } from "@/lib/supabaseReads";
import { resolveImageSearchDetails, buildImageSearchQuery } from "@/lib/car-search";
import { fuzzyMatchInventory, aiResolveInventoryMatches } from "@/lib/chat-car-resolve";
import { dedupeCarTexts, carTextKey } from "@/lib/car-text";
import { logger } from "@/lib/logger";

const IMAGE_SEARCH_BODY_TYPES = [
  "دفع رباعي",
  "سيدان",
  "هاتشباك",
  "كشف",
  "كوبيه",
  "ستيشن",
  "بيك أب",
  "رياضية",
];

function parseAiJsonResponse(text) {
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);
}

function normalizeImageSearchColor(color = "") {
  const trimmed = String(color).trim();
  if (!trimmed) return "";

  // DB colors are usually a single word; drop modifiers like غامق/فاتح/لؤلؤي
  return trimmed.split(/\s+/)[0];
}

function cleanImageSearchData(data) {
  const bodyType = IMAGE_SEARCH_BODY_TYPES.find(
    (type) => type === String(data?.bodyType || "").trim()
  );

  return {
    make: String(data?.make || "").trim(),
    model: String(data?.model || "").trim(),
    bodyType: bodyType || "",
    color: normalizeImageSearchColor(data?.color),
    confidence: Number(data?.confidence) || 0,
  };
}

async function getAvailableMakeModels() {
  try {
    const rows = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: { make: true, model: true },
    });
    return rows;
  } catch (error) {
    const sb = getSupabasePublic();
    if (!sb) return [];

    const { data, error: supabaseError } = await sb
      .from("Car")
      .select("make, model")
      .eq("status", "AVAILABLE");

    if (supabaseError) {
      console.warn("[getAvailableMakeModels] Supabase failed:", supabaseError.message);
      return [];
    }

    return data ?? [];
  }
}

/** {makes, models, pairs} shape expected by the shared inventory resolvers. */
function buildInventoryCatalog(rows = []) {
  const pairs = rows
    .map((row) => ({
      make: String(row?.make || "").trim(),
      model: String(row?.model || "").trim(),
    }))
    .filter((pair) => pair.make && pair.model);

  return {
    makes: dedupeCarTexts(pairs.map((p) => p.make)),
    models: dedupeCarTexts(pairs.map((p) => p.model)),
    pairs,
  };
}

function inventoryHasPair(catalog, make, model) {
  if (!make || !model) return false;
  const makeKey = carTextKey(make);
  const modelKey = carTextKey(model);
  return catalog.pairs.some(
    (pair) => carTextKey(pair.make) === makeKey && carTextKey(pair.model) === modelKey
  );
}

function inventoryHasMake(catalog, make) {
  if (!make) return false;
  const makeKey = carTextKey(make);
  return catalog.pairs.some((pair) => carTextKey(pair.make) === makeKey);
}

/**
 * Gemini reads the car well but spells it its own way ("إينوفا" for "إنوفا",
 * "اكس 70" for "X70"). The listing search ANDs every token, so a single letter
 * off returns nothing at all. Snap the AI answer onto a real inventory
 * make/model before it becomes a search query, and degrade to make-only rather
 * than sending the customer to an empty results page.
 */
async function resolveImageSearchAgainstInventory(carDetails, catalog) {
  const exact = resolveImageSearchDetails(carDetails, catalog.pairs);
  if (inventoryHasPair(catalog, exact.make, exact.model)) {
    return exact;
  }

  const freeText = buildImageSearchQuery(carDetails.make, carDetails.model);

  const fuzzy = fuzzyMatchInventory(freeText, catalog, { limit: 1, minScore: 0.6 });
  if (fuzzy[0]?.make && fuzzy[0]?.model) {
    logger.debug("[image-search] Fuzzy inventory match", {
      from: freeText,
      to: `${fuzzy[0].make} ${fuzzy[0].model}`,
      score: Number(fuzzy[0].score.toFixed(2)),
    });
    return {
      make: fuzzy[0].make,
      model: fuzzy[0].model,
      searchQuery: buildImageSearchQuery(fuzzy[0].make, fuzzy[0].model),
    };
  }

  const aiMatches = await aiResolveInventoryMatches(freeText, catalog, { limit: 1 });
  if (aiMatches[0]?.make) {
    const match = aiMatches[0];
    logger.debug("[image-search] AI inventory match", {
      from: freeText,
      to: `${match.make} ${match.model || ""}`.trim(),
    });
    return {
      make: match.make,
      model: match.model || "",
      searchQuery: buildImageSearchQuery(match.make, match.model || ""),
    };
  }

  // Nothing matched the pair — a make-only search still beats zero results.
  if (inventoryHasMake(catalog, exact.make)) {
    return { ...exact, model: "", searchQuery: buildImageSearchQuery(exact.make, "") };
  }

  return exact;
}

export const getFeaturedCars = unstable_cache(
  async (limit = 4) => {
    try {
      const orderBy = [...carDisplayPriorityOrderBy, { createdAt: "desc" }];

      const cars = await db.car.findMany({
        where: { status: "AVAILABLE" },
        take: limit,
        orderBy,
      });

      if (!cars.length) {
        return { success: true, data: [] };
      }

      const serializedCars = cars.map((c) => serializedCarsData(c));

      return {
        success: true,
        data: serializedCars,
      };
    } catch (error) {
      console.warn("[getFeaturedCars] Prisma failed, using Supabase:", error.message);
      return getFeaturedCarsSupabase(limit);
    }
  },
  ["home-featured-cars-v2"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getOfferCars = unstable_cache(
  async (limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          featured: true,
        },
        take: limit,
        orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getOfferCars] Prisma failed, using Supabase:", error.message);
      return getHomeCarsByQuerySupabase({ limit, featured: true });
    }
  },
  ["home-offer-cars-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getLuxuryCars = unstable_cache(
  async (limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          isLuxury: true,
        },
        take: limit,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getLuxuryCars] Prisma failed, using Supabase:", error.message);
      return getHomeCarsByQuerySupabase({ limit, isLuxury: true });
    }
  },
  ["home-luxury-cars-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getEconomicCars = unstable_cache(
  async (limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          isEconomic: true,
        },
        take: limit,
        orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getEconomicCars] Prisma failed, using Supabase:", error.message);
      return getHomeCarsByQuerySupabase({ limit, isEconomic: true });
    }
  },
  ["home-economic-cars-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getCommercialCars = unstable_cache(
  async (limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          isCommercial: true,
        },
        take: limit,
        orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getCommercialCars] Prisma failed, using Supabase:", error.message);
      return getHomeCarsByQuerySupabase({ limit, isCommercial: true });
    }
  },
  ["home-commercial-cars-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getCarsByBodyType = unstable_cache(
  async (bodyType, limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          bodyType,
        },
        take: limit,
        orderBy: [...carDisplayPriorityOrderBy, { createdAt: "desc" }],
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getCarsByBodyType] Prisma failed, using Supabase:", error.message);
      return getHomeCarsByQuerySupabase({ limit, bodyType });
    }
  },
  ["home-cars-by-body-type-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export const getRegularCars = unstable_cache(
  async (limit = 8) => {
    try {
      const cars = await db.car.findMany({
        where: {
          status: "AVAILABLE",
          isLuxury: false,
          featured: false,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: cars.map((car) => serializedCarsData(car)),
      };
    } catch (error) {
      console.warn("[getRegularCars] Prisma failed:", error.message);
      return { success: false, data: [] };
    }
  },
  ["home-regular-cars-v1"],
  { revalidate: 3600, tags: ["cars"] }
);

export async function processAiImageSearch(formData) {
  try {
    // // rate limitin gwith arcjet
    // const req = await request();
    // const decision = await aj.protect(req, { requested: 1 });

    // if (decision.isDenied()) {
    //   if (decision.reason.isRateLimit()) {
    //     const { remaining, reset } = decision.reason;

    //     console.error({
    //       code: "RATE_LIMIT_EXCEEDEED",
    //       details: {
    //         remaining,
    //         resetInSeconds: reset,
    //       },
    //     });
    //     throw new Error("Too many requests. Please try again later");
    //   }
    //   throw new Error("Request Blocked");
    // }

    //check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API Key is not configured");
    }

    // Extract file from FormData
    const file = formData.get("image");
    if (!file) {
      throw new Error("No image file provided");
    }

    // Using resilient Gemini (auto-failover on 503/429)
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
    };

    // converting the image into base64 string
    const base64Image = await fileToBase64(file);

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type || "image/jpeg",
      },
    };

    const inventory = await getAvailableMakeModels();
    const catalog = buildInventoryCatalog(inventory);
    // Showing the model the real inventory removes most of the spelling drift
    // that used to make the resulting search query match nothing.
    const catalogContext = catalog.pairs.length
      ? `\n      قائمة السيارات المتوفرة فعلياً في المعرض (الماركة | الموديل):\n${[
          ...new Set(catalog.pairs.map((p) => `      - ${p.make} | ${p.model}`)),
        ].join("\n")}\n`
      : "";

    // Define the prompt for car detail extraction
    const prompt = `
      قم بتحليل صورة السيارة هذه واستخراج المعلومات التالية لاستعلام البحث:
      1. الشركة المصنعة (Make)
      2. الموديل (Model)
      3. نوع الهيكل - اختر واحداً فقط من: دفع رباعي، سيدان، هاتشباك، كشف، كوبيه، ستيشن، بيك أب، رياضية
      4. اللون - بالعربية فقط (كلمة واحدة أساسية مثل: أبيض، أسود، رمادي، فضي)

      ركّز بدقة على الشركة المصنعة والموديل لأنهما الأهم للبحث.
${catalogContext}
      مهم جداً:
      - إذا كانت السيارة في الصورة موجودة في القائمة أعلاه، فانسخ اسم الماركة والموديل **حرفياً** كما وردا في القائمة (حتى لو كان الموديل بحروف لاتينية مثل X70 أو U5).
      - إذا لم تكن موجودة في القائمة، اكتب الماركة والموديل بالعربية بأشهر تسمية سعودية لها.
      - نوع الهيكل (bodyType) يجب أن يكون بالضبط واحد من هذه القيم: "دفع رباعي" أو "سيدان" أو "هاتشباك" أو "كشف" أو "كوبيه" أو "ستيشن" أو "بيك أب" أو "رياضية"
      - اللون بالعربية فقط.
      - بالنسبة للثقة (confidence)، قدم قيمة بين 0 و 1 تمثل مدى ثقتك في التعرف العام.

      قم بتنسيق إجابتك ككائن JSON نظيف بهذه الحقول:
      {
        "make": "",
        "model": "",
        "bodyType": "",
        "color": "",
        "confidence": 0.0
      }

      قم بالرد بكائن JSON فقط، لا شيء آخر.
      `;

    const { text } = await generateContentResilient([imagePart, prompt], {
      generationConfig,
    });
    let parsed;
    try {
      parsed = parseAiJsonResponse(text);
    } catch {
      throw new Error("تعذر قراءة نتيجة تحليل الصورة");
    }

    const carDetails = cleanImageSearchData(parsed);
    const resolved = await resolveImageSearchAgainstInventory(carDetails, catalog);

    return {
      success: true,
      data: {
        ...carDetails,
        make: resolved.make,
        model: resolved.model,
        searchQuery: resolved.searchQuery,
      },
    };

  } catch (error) {
    console.error("AI Image Search Error:", error);

    // Provide user-friendly error messages
    let errorMessage = "فشل تحليل الصورة. ";

    if (error.message?.includes("503") || error.message?.includes("overloaded")) {
      errorMessage += "الخدمة مزدحمة حالياً. يرجى المحاولة مرة أخرى بعد قليل.";
    } else if (error.message?.includes("API key")) {
      errorMessage += "خطأ في إعدادات النظام.";
    } else if (error.message?.includes("No image")) {
      errorMessage += "لم يتم رفع صورة.";
    } else {
      errorMessage += "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
