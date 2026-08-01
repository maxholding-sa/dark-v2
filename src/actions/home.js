"use server";

import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { getGeminiModel } from "@/lib/gemini";

// Function to convert File to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

import { unstable_cache } from "next/cache";
import { carDisplayPriorityOrderBy } from "@/lib/data";
import { getFeaturedCarsSupabase, getHomeCarsByQuerySupabase, getSupabasePublic } from "@/lib/supabaseReads";
import { resolveImageSearchDetails } from "@/lib/car-search";
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

    // Using stable flash alias with retry logic for 503 errors
    const model = getGeminiModel({
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
    });

    // converting the image into base64 string
    const base64Image = await fileToBase64(file);

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type || "image/jpeg",
      },
    };

    // Define the prompt for car detail extraction
    const prompt = `
      قم بتحليل صورة السيارة هذه واستخراج المعلومات التالية لاستعلام البحث:
      1. الشركة المصنعة (Make) - بالعربية فقط
      2. الموديل (Model) - بالعربية فقط
      3. نوع الهيكل - اختر واحداً فقط من: دفع رباعي، سيدان، هاتشباك، كشف، كوبيه، ستيشن، بيك أب، رياضية
      4. اللون - بالعربية فقط (كلمة واحدة أساسية مثل: أبيض، أسود، رمادي، فضي)

      ركّز بدقة على الشركة المصنعة والموديل لأنهما الأهم للبحث.
      إذا تعرّفت على شعار أو اسم مثل SPECTRE فاستخدم الموديل العربي الصحيح (مثل: سبيكتر).

      قم بتنسيق إجابتك ككائن JSON نظيف بهذه الحقول:
      {
        "make": "",
        "model": "",
        "bodyType": "",
        "color": "",
        "confidence": 0.0
      }

      مهم جداً: 
      - يجب أن تكون جميع حقول النص (make, bodyType, color) باللغة العربية فقط.
      - نوع الهيكل (bodyType) يجب أن يكون بالضبط واحد من هذه القيم: "دفع رباعي" أو "سيدان" أو "هاتشباك" أو "كشف" أو "كوبيه" أو "ستيشن" أو "بيك أب" أو "رياضية"
      - بالنسبة للثقة (confidence)، قدم قيمة بين 0 و 1 تمثل مدى ثقتك في التعرف العام.
      قم بالرد بكائن JSON فقط، لا شيء آخر. يجب أن تكون جميع القيم النصية باللغة العربية.
      `;

    // Retry logic for handling 503 errors
    let retries = 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        const result = await model.generateContent([imagePart, prompt]); // generate a result
        const response = result.response;
        const text = response.text(); // take the text from the response
        let parsed;
        try {
          parsed = parseAiJsonResponse(text);
        } catch (parseError) {
          throw new Error("تعذر قراءة نتيجة تحليل الصورة");
        }

        const carDetails = cleanImageSearchData(parsed);
        const inventory = await getAvailableMakeModels();
        const resolved = resolveImageSearchDetails(carDetails, inventory);

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
        lastError = error;

        // Check if it's a 503 error and retry
        if (error.message?.includes("503") || error.message?.includes("overloaded")) {
          logger.info("[home-actions] Retrying after model overload", {
            attempt: i + 1,
            retries,
          });
          if (i < retries - 1) {
            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            continue;
          }
        }

        // If it's not a 503 or last retry, throw the error
        throw error;
      }
    }

    // If all retries failed
    throw lastError;

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
