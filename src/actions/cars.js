// server actions -> bascially API calls
// All the cars related APIs

"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { createClient } from "@/lib/superbase";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";
import {
  BrandSegmentNotFoundError,
  resolveInsuranceSegmentForCar,
} from "@/lib/brand-segment";
import { DEFAULT_BRAND_SEGMENT_MAP } from "@/lib/loan-calculator";
import { normalizeCarText } from "@/lib/car-text";

// function to convert File to Base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer(); //Converting the file into a raw binary ArrayBuffer
  const buffer = Buffer.from(bytes); //Converting the ArrayBuffer into a Node.js Buffer
  return buffer.toString("base64"); //Encodes the buffer into a Base64 string
}

// processing the Car image with gemini api
export async function processCarImageWithAI(formData) {
  try {
    //check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API Key is not configured");
    }

    // Extract file from FormData
    const file = formData.get("image");
    if (!file) {
      throw new Error("No image file provided");
    }

    const { generateContentResilient } = await import("@/lib/gemini");
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    };

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
      قم بتحليل صورة السيارة هذه واستخراج المعلومات التالية بالعربية:
      1. الشركة المصنعة (Make)
      2. الموديل (Model)
      3. السنة (تقريباً)
      4. اللون
      5. نوع الهيكل - اختر واحداً فقط من: دفع رباعي، سيدان، هاتشباك، كشف، كوبيه، ستيشن، بيك أب، رياضية
      6. استهلاك الوقود (تخمينك الأفضل بالكيلومتر لكل لتر ويجب أن يكون رقم في نص)
      7. نوع الوقود - اختر واحداً فقط من: بنزين، ديزل، كهربائي، هجين، هجين قابل للشحن
      8. نوع ناقل الحركة - اختر واحداً فقط من: أوتوماتيك، يدوي، نصف أوتوماتيك
      9. السعر (تخمينك الأفضل بالريال السعودي)
      10. وصف طويل بالعربية لإضافته إلى قائمة السيارة

      قم بتنسيق إجابتك ككائن JSON نظيف بهذه الحقول:
      {
        "make": "",
        "model": "",
        "year": 0000,
        "color": "",
        "price": "",
        "mileage": "",
        "bodyType": "",
        "fuelType": "",
        "transmission": "",
        "description": "",
        "seats": 00,
        "confidence": 0.0
      }

      مهم جداً:
      - نوع الهيكل (bodyType) يجب أن يكون بالضبط واحد من: "دفع رباعي" أو "سيدان" أو "هاتشباك" أو "كشف" أو "كوبيه" أو "ستيشن" أو "بيك أب" أو "رياضية"
      - نوع الوقود (fuelType) يجب أن يكون واحد من: "بنزين" أو "ديزل" أو "كهربائي" أو "هجين" أو "هجين قابل للشحن"
      - ناقل الحركة (transmission) يجب أن يكون واحد من: "أوتوماتيك" أو "يدوي" أو "نصف أوتوماتيك"
      - بالنسبة للثقة (confidence)، قدم قيمة بين 0 و 1 تمثل مدى ثقتك في التعرف العام.
      قم بالرد بكائن JSON فقط، لا شيء آخر.
      تأكد من أن جميع النصوص (اللون، نوع الهيكل، نوع الوقود، ناقل الحركة، الوصف) باللغة العربية.
    `;

    const { text } = await generateContentResilient([imagePart, prompt], {
      generationConfig,
    });
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const carDetails = JSON.parse(cleanedText);

    // validate the response and return the final response
    const requiredFields = [
      "make",
      "model",
      "year",
      "color",
      "price",
      "mileage",
      "bodyType",
      "fuelType",
      "transmission",
      "description",
      "confidence",
    ];

    const missingFields = requiredFields.filter(
      (field) => !(field in carDetails)
    );

    if (missingFields.length > 0) {
      throw new Error(
        `AI response missing required fields : ${missingFields.join(",")}`
      );
    }

    return {
      success: true,
      data: carDetails,
    };

  } catch (error) {
    console.error("AI Car Image Processing Error:", error);

    // Provide user-friendly error messages
    let errorMessage = "فشل تحليل الصورة. ";

    if (error.message?.includes("503") || error.message?.includes("overloaded")) {
      errorMessage += "الخدمة مزدحمة حالياً. يرجى المحاولة مرة أخرى بعد قليل.";
    } else if (error.message?.includes("API key")) {
      errorMessage += "خطأ في إعدادات النظام.";
    } else if (error.message?.includes("No image")) {
      errorMessage += "لم يتم رفع صورة.";
    } else if (error.message?.includes("parse")) {
      errorMessage += "فشل في تحليل الاستجابة. حاول بصورة أوضح.";
    } else {
      errorMessage += "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// adding the cars data to the db
export async function addCarToDB({ carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    // stray spaces here become duplicate entries in the make/model dropdowns
    const make = normalizeCarText(carData.make);
    const model = normalizeCarText(carData.model);

    const carId = uuidv4(); //unique id for cars
    const folderPath = `cars/${carId}`; //intialize a carfolder path in superbase storage

    // For image storage
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const imageUrls = [];

    //loop through images
    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i];

      // skip if image data is not valid
      if (!base64Data || !base64Data.startsWith("data:image/")) {
        console.warn("skipping invalid image data");
        continue;
      }

      // extract the base 64 part(remove the data:image/xyz;base64, prefix)
      const base64 = base64Data.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      //determine image extension from the data URL
      const mimeMatch = base64Data.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtenstion = mimeMatch ? mimeMatch[1] : "jpeg";

      // create filename
      const fileName = `image-${Date.now()}-${i}.${fileExtenstion}`;
      const filePath = `${folderPath}/${fileName}`;

      // uploading the images in storage bucket in superbase
      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtenstion}`,
        });

      if (error) {
        console.error("Error while uploading the image : ", error);
        throw new Error(`Failed to upload the image : ${error.message}`);
      }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;
      imageUrls.push(publicUrl);
    }

    // Resolve insurance category once from canonical brand table (no silent fallback).
    let insuranceSegment;
    try {
      insuranceSegment = resolveInsuranceSegmentForCar(make, DEFAULT_BRAND_SEGMENT_MAP);
    } catch (error) {
      if (error instanceof BrandSegmentNotFoundError) {
        throw new Error(
          `لا يمكن حفظ السيارة: ${error.message} أضف الماركة إلى جدول فئات التأمين أو صحّح اسم الشركة المصنعة.`
        );
      }
      throw error;
    }

    // Add the car to the database
    const car = await db.car.create({
      data: {
        id: carId, // Use the same ID we used for the folder
        make,
        model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        category: normalizeCarText(carData.category),
        videoUrl: carData.videoUrl,
        status: carData.status,
        featured: carData.featured,
        isLuxury: carData.isLuxury,
        isEconomic: carData.isEconomic,
        isCommercial: carData.isCommercial,
        driveType: carData.driveType,
        testDriveAvailable: carData.testDriveAvailable,
        insuranceSegment,
        images: imageUrls, // Store the array of image URLs
      },
    });

    revalidatePath("/admin/cars");
    revalidateTag("cars");

    return {
      success: true,
    };
  } catch (error) {
    throw new Error(`Error : ${error.message}`);
  }
}

//fetch cars from db
export async function getCars(search = "") {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    let where = {};

    if (search) {
      where.OR = [
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const cars = await db.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const serializedCars = cars.map(serializedCarsData);

    return {
      success: true,
      data: serializedCars,
    };
  } catch (error) {
    console.error(`Error while gettingCars from DB ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// delete car and its images from db
export async function deleteCars(carId) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    // check if the car is present in db
    const car = await db.car.findUnique({
      where: { id: carId },
      select: { images: true },
    });

    // return if no car is foudn
    if (!car) {
      return {
        success: false,
        error: "Car Not found",
      };
    }

    // delete the car
    await db.car.delete({
      where: { id: carId },
    });

    // deleting images from the storage bucket
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const filePaths = car.images
        .map((imageUrl) => {
          const url = new URL(imageUrl);
          const pathMatch = url.pathname.match(/\/car-images\/(.*)/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        const { error } = await supabase.storage
          .from("car-images")
          .remove(filePaths);

        if (error) {
          console.error(`Error deleting images : ${error}`);
        }
      }
    } catch (storageError) {
      console.error("Error while deleting images : ", storageError);
    }

    revalidatePath("/admin/cars");
    revalidateTag("cars");
    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error with storage operations ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

//updateCarStatus
export async function updateCarStatus(id, { status, featured, testDriveAvailable }) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    const updatedData = {};
    if (status !== undefined) updatedData.status = status;
    if (featured !== undefined) updatedData.featured = featured;
    if (testDriveAvailable !== undefined) updatedData.testDriveAvailable = testDriveAvailable;

    await db.car.update({
      where: { id: id },
      data: updatedData,
    });

    revalidatePath("/admin/cars");
    revalidateTag("cars");
    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while upadating the Car status ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// updateCar - full update for editing car details
export async function updateCar(id, carData, newImages = []) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    // check if the car exists
    const existingCar = await db.car.findUnique({
      where: { id: id },
    });

    if (!existingCar) {
      return {
        success: false,
        error: "Car not found",
      };
    }

    const folderPath = `cars/${id}`; // use existing folder

    // For image storage
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let imageUrls = [];

    // Process all images: existing URLs and new data URLs
    for (let i = 0; i < newImages.length; i++) {
      const imageData = newImages[i];

      if (imageData.startsWith("data:image/")) {
        // New image to upload
        // extract the base 64 part
        const base64 = imageData.split(",")[1];
        const imageBuffer = Buffer.from(base64, "base64");

        // determine image extension
        const mimeMatch = imageData.match(/data:image\/([a-zA-Z0-9]+);/);
        const fileExtenstion = mimeMatch ? mimeMatch[1] : "jpeg";

        // create filename
        const fileName = `image-${Date.now()}-${i}.${fileExtenstion}`;
        const filePath = `${folderPath}/${fileName}`;

        // uploading the images
        const { data, error } = await supabase.storage
          .from("car-images")
          .upload(filePath, imageBuffer, {
            contentType: `image/${fileExtenstion}`,
          });

        if (error) {
          console.error("Error while uploading the image : ", error);
          throw new Error(`Failed to upload the image : ${error.message}`);
        }

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;
        imageUrls.push(publicUrl);
      } else {
        // Existing URL, keep as is
        imageUrls.push(imageData);
      }
    }

    // stray spaces here become duplicate entries in the make/model dropdowns
    const make = normalizeCarText(carData.make);
    const model = normalizeCarText(carData.model);

    const makeChanged = make !== normalizeCarText(existingCar.make);

    let insuranceSegment = existingCar.insuranceSegment;
    if (makeChanged || !insuranceSegment) {
      try {
        insuranceSegment = resolveInsuranceSegmentForCar(make, DEFAULT_BRAND_SEGMENT_MAP);
      } catch (error) {
        if (error instanceof BrandSegmentNotFoundError) {
          return {
            success: false,
            error: `لا يمكن حفظ السيارة: ${error.message} أضف الماركة إلى جدول فئات التأمين أو صحّح اسم الشركة المصنعة.`,
          };
        }
        throw error;
      }
    }

    // Update the car in the database
    const updatedCar = await db.car.update({
      where: { id: id },
      data: {
        make,
        model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        category: normalizeCarText(carData.category),
        videoUrl: carData.videoUrl,
        status: carData.status,
        featured: carData.featured,
        isLuxury: carData.isLuxury,
        isEconomic: carData.isEconomic,
        isCommercial: carData.isCommercial,
        driveType: carData.driveType,
        testDriveAvailable: carData.testDriveAvailable,
        insuranceSegment,
        images: imageUrls, // update images if new ones provided
      },
    });

    revalidatePath("/admin/cars");
    revalidatePath(`/admin/cars/${id}/edit`);
    revalidateTag("cars");

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while updating the Car ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export all cars to Excel-ready format
export async function exportCars() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    const cars = await db.car.findMany({ orderBy: { createdAt: "desc" } });

    const rows = cars.map((car) => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      price: car.price ? parseFloat(car.price.toString()) : 0,
      mileage: car.mileage,
      color: car.color,
      fuelType: car.fuelType,
      transmission: car.transmission,
      bodyType: car.bodyType,
      isLuxury: car.isLuxury ? "نعم" : "لا",
      isEconomic: car.isEconomic ? "نعم" : "لا",
      isCommercial: car.isCommercial ? "نعم" : "لا",
      insuranceSegment: car.insuranceSegment ?? "",
      driveType: car.driveType ?? "",
      seats: car.seats ?? "",
      category: car.category ?? "",
      videoUrl: car.videoUrl ?? "",
      status: car.status,
      featured: car.featured ? "نعم" : "لا",
      testDriveAvailable: car.testDriveAvailable ? "نعم" : "لا",
      description: car.description,
    }));

    return { success: true, data: rows };
  } catch (error) {
    console.error("exportCars error:", error);
    return { success: false, error: error.message };
  }
}

import { compareImportRows } from "@/lib/car-import-diff";

// Step 1: Compare only — no DB writes, returns diff for admin review
export async function compareCarImport(rows) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "لا توجد بيانات للمعالجة" };
    }

    const ids = rows.map((r) => r.id).filter(Boolean);
    const existing = await db.car.findMany({ where: { id: { in: ids } } });
    const { changes, toUpdate } = compareImportRows(rows, existing);

    return { success: true, changes, toUpdate };
  } catch (error) {
    console.error("compareCarImport error:", error);
    return { success: false, error: error.message };
  }
}

// Step 2: Apply confirmed updates
export async function applyCarImport(toUpdate) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    if (!Array.isArray(toUpdate) || toUpdate.length === 0) {
      return { success: false, error: "لا توجد تحديثات للتطبيق" };
    }

    await db.$transaction(
      toUpdate.map(({ id, data }) => db.car.update({ where: { id }, data }))
    );

    revalidatePath("/admin/cars");
    revalidateTag("cars");

    return { success: true, updated: toUpdate.length };
  } catch (error) {
    console.error("applyCarImport error:", error);
    return { success: false, error: error.message };
  }
}

// getCarForEdit - fetch single car for editing
export async function getCarForEdit(carId) {
  try {
    // check if user is loggedin
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "cars");
    if (!hasPermission) throw new Error("Unauthorized access");

    const car = await db.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      return {
        success: false,
        error: "Car not found",
      };
    }

    const serializedCar = serializedCarsData(car);

    return {
      success: true,
      data: serializedCar,
    };
  } catch (error) {
    console.error(`Error while getting car for edit ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
