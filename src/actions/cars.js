// server actions -> bascially API calls
// All the cars related APIs

"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { createClient } from "@/lib/superbase";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { checkPermission } from "@/lib/permissions";
import { getCarByIdSupabase } from "@/lib/supabaseReads";

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Using gemini-2.5-flash - latest model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
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

    // Retry logic for handling 503 errors
    let retries = 3;
    let lastError;
    let carDetails;

    for (let i = 0; i < retries; i++) {
      try {
        const result = await model.generateContent([imagePart, prompt]); // generate a result
        const response = await result.response;
        const text = response.text(); // take the text from the response
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim(); // clean the response text

        carDetails = JSON.parse(cleanedText);
        break; // Success, exit retry loop
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
    if (!carDetails) {
      throw lastError;
    }

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

    // Add the car to the database
    const car = await db.car.create({
      data: {
        id: carId, // Use the same ID we used for the folder
        make: carData.make,
        model: carData.model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        category: carData.category,
        videoUrl: carData.videoUrl,
        status: carData.status,
        featured: carData.featured,
        isLuxury: carData.isLuxury,
        driveType: carData.driveType,
        testDriveAvailable: carData.testDriveAvailable,
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

    // Update the car in the database
    const updatedCar = await db.car.update({
      where: { id: id },
      data: {
        make: carData.make,
        model: carData.model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        category: carData.category,
        videoUrl: carData.videoUrl,
        status: carData.status,
        featured: carData.featured,
        isLuxury: carData.isLuxury,
        driveType: carData.driveType,
        testDriveAvailable: carData.testDriveAvailable,
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

// get cardetails by id (includes dealership + testdrive info)
export async function getCarById(carId) {
  try {
    const user = await getAuthenticatedUser();

    const car = await db.car.findUnique({
      where: { id: carId },
    });

    if (!car)
      return {
        success: false,
        message: "Car not found",
      };

    // Check if car is wishlisted by user
    let isWishlisted = false;
    let userTestDrive = null;

    let existingTestDrive;

    if (user) {
      const savedCar = await db.UserSavedCar.findUnique({
        where: {
          userId_carId: {
            carId,
            userId: user.id,
          },
        },
      });

      isWishlisted = !!savedCar;

      // Check if user has already booked a test drive for this car
      existingTestDrive = await db.TestDriveBooking.findFirst({
        where: {
          carId,
          userId: user.id,
          status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (existingTestDrive) {
      userTestDrive = {
        id: existingTestDrive.id,
        status: existingTestDrive.status,
        bookingDate: existingTestDrive.bookingDate.toISOString(),
      };
    }

    // Get dealership info for test drive availability
    const dealership = await db.DealershipInfo.findFirst({
      include: {
        workingHours: true,
      },
    });

    // Get all existing bookings for this car (pending or confirmed)
    const existingBookings = await db.TestDriveBooking.findMany({
      where: {
        carId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        bookingDate: true,
        startTime: true,
        endTime: true,
      },
    });

    return {
      success: true,
      data: {
        ...serializedCarsData(car, isWishlisted),
        testDriveInfo: {
          userTestDrive,
          dealership: dealership
            ? {
              ...dealership,
              createdAt: dealership.createdAt.toISOString(),
              updatedAt: dealership.updatedAt.toISOString(),
              workingHours: dealership.workingHours.map((hour) => ({
                ...hour,
                createdAt: hour.createdAt.toISOString(),
                updatedAt: hour.updatedAt.toISOString(),
              })),
            }
            : null,
          existingBookings: existingBookings.map((booking) => ({
            date: booking.bookingDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
        },
      },
      user: user,
    };
  } catch (error) {
    console.warn("[getCarById] Prisma failed, using Supabase:", error.message);
    return getCarByIdSupabase(carId);
  }
}
