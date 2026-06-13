"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/lib/superbase";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

import { unstable_cache } from "next/cache";
import { getFeaturedModelsSupabase } from "@/lib/supabaseReads";
import { bodyTypeOptions as predefinedBodyTypes } from "@/lib/data";

// Get unique car body types from database
export async function getCarBodyTypes() {
  try {
    const cars = await db.car.findMany({
      select: {
        bodyType: true,
      },
      distinct: ['bodyType'],
      orderBy: {
        bodyType: 'asc',
      },
    });

    const dbBodyTypes = cars.map(car => car.bodyType);
    
    // Merge with predefined ones and remove duplicates
    const allBodyTypes = Array.from(new Set([...dbBodyTypes, ...predefinedBodyTypes])).sort();

    return {
      success: true,
      data: allBodyTypes,
    };
  } catch (error) {
    console.error("Error fetching car body types:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get all featured models (public - no auth required)
export const getFeaturedModels = unstable_cache(
  async () => {
    try {
      const models = await db.featuredModel.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      return {
        success: true,
        data: models,
      };
    } catch (error) {
      console.warn("[getFeaturedModels] Prisma failed, using Supabase:", error.message);
      return getFeaturedModelsSupabase();
    }
  },
  ["home-featured-models-v2"],
  { revalidate: 3600, tags: ["models"] }
);

// Get all featured models for admin (includes inactive)
export async function getAllFeaturedModelsAdmin(search = "") {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    let where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameAr: { contains: search, mode: "insensitive" } },
      ];
    }

    const models = await db.featuredModel.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: models,
    };
  } catch (error) {
    console.error("Error fetching featured models for admin:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Create new featured model
export async function createFeaturedModel({ name, nameAr, image, order }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const modelId = uuidv4();
    let imageUrl = "";

    // Handle image upload if provided
    if (image && image.startsWith("data:image/")) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const base64 = image.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      const mimeMatch = image.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtension = mimeMatch ? mimeMatch[1] : "png";

      const fileName = `model-${Date.now()}.${fileExtension}`;
      const filePath = `models/${fileName}`;

      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`,
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;
    } else {
      imageUrl = image; // Use URL directly if not base64
    }

    const model = await db.featuredModel.create({
      data: {
        id: modelId,
        name,
        nameAr,
        image: imageUrl,
        order: order || 0,
        isActive: true,
      },
    });

    revalidatePath("/admin/featured-models");
    revalidatePath("/");
    revalidatePath("/featured-models");

    return {
      success: true,
      data: model,
    };
  } catch (error) {
    console.error("Error creating featured model:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update featured model
export async function updateFeaturedModel(id, { name, nameAr, image, order, isActive }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    // Get existing model to get old image URL
    const existingModel = await db.featuredModel.findUnique({
      where: { id },
    });

    if (!existingModel) {
      throw new Error("Model not found");
    }

    let imageUrl = existingModel.image;

    // Handle new image upload if provided
    if (image && image.startsWith("data:image/")) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      // Delete old image if it's in our storage
      if (existingModel.image && existingModel.image.includes("car-images/models/")) {
        try {
          const oldImagePath = existingModel.image.split("car-images/")[1];
          await supabase.storage.from("car-images").remove([oldImagePath]);
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
        }
      }

      // Upload new image
      const base64 = image.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      const mimeMatch = image.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtension = mimeMatch ? mimeMatch[1] : "png";

      const fileName = `model-${Date.now()}.${fileExtension}`;
      const filePath = `models/${fileName}`;

      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`,
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;
    } else if (image && image !== existingModel.image) {
      imageUrl = image; // Use new URL if provided
    }

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (nameAr !== undefined) updatedData.nameAr = nameAr;
    if (imageUrl !== undefined) updatedData.image = imageUrl;
    if (order !== undefined) updatedData.order = order;
    if (isActive !== undefined) updatedData.isActive = isActive;

    const model = await db.featuredModel.update({
      where: { id },
      data: updatedData,
    });

    revalidatePath("/admin/featured-models");
    revalidatePath("/");
    revalidatePath("/featured-models");

    return {
      success: true,
      data: model,
    };
  } catch (error) {
    console.error("Error updating featured model:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete featured model
export async function deleteFeaturedModel(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const model = await db.featuredModel.findUnique({
      where: { id },
    });

    if (!model) {
      return {
        success: false,
        error: "Model not found",
      };
    }

    // Delete the model
    await db.featuredModel.delete({
      where: { id },
    });

    // Delete image from storage if it's in our storage
    if (model.image && model.image.includes("car-images/models/")) {
      try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const imagePath = model.image.split("car-images/")[1];
        await supabase.storage.from("car-images").remove([imagePath]);
      } catch (storageError) {
        console.error("Error deleting model image:", storageError);
      }
    }

    revalidatePath("/admin/featured-models");
    revalidatePath("/");
    revalidatePath("/featured-models");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting featured model:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Toggle model active status
export async function toggleFeaturedModelStatus(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const model = await db.featuredModel.findUnique({
      where: { id },
    });

    if (!model) {
      return {
        success: false,
        error: "Model not found",
      };
    }

    const updatedModel = await db.featuredModel.update({
      where: { id },
      data: { isActive: !model.isActive },
    });

    revalidatePath("/admin/featured-models");
    revalidatePath("/");
    revalidatePath("/featured-models");

    return {
      success: true,
      data: updatedModel,
    };
  } catch (error) {
    console.error("Error toggling model status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
