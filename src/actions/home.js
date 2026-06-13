"use server";

import aj from "@/lib/arcjet";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Function to convert File to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

import { unstable_cache } from "next/cache";
import { carDisplayPriorityOrderBy } from "@/lib/data";
import { getFeaturedCarsSupabase } from "@/lib/supabaseReads";

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Using gemini-2.5-flash with retry logic for 503 errors
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });

    // converting the image into base64 string
    const base64Image = await fileToBase64(file);

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };

    // Define the prompt for car detail extraction
    const prompt = `
      قم بتحليل صورة السيارة هذه واستخراج المعلومات التالية لاستعلام البحث:
      1. الشركة المصنعة (Make) - بالعربية فقط
      2. نوع الهيكل - اختر واحداً فقط من: دفع رباعي، سيدان، هاتشباك، كشف، كوبيه، ستيشن، بيك أب، رياضية
      3. اللون - بالعربية فقط

      قم بتنسيق إجابتك ككائن JSON نظيف بهذه الحقول:
      {
        "make": "",
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
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim(); // clean the response text

        const carDetails = JSON.parse(cleanedText);
        return {
          success: true,
          data: carDetails,
        };
      } catch (error) {
        lastError = error;

        // Check if it's a 503 error and retry
        if (error.message?.includes("503") || error.message?.includes("overloaded")) {
          console.log(`Retry attempt ${i + 1}/${retries} after model overload...`);
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
