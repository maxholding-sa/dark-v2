"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/lib/superbase";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

import { unstable_cache } from "next/cache";
import { getFeaturedBrandsSupabase } from "@/lib/supabaseReads";

// Get unique car makes from database
export async function getCarMakes() {
  try {
    const cars = await db.car.findMany({
      select: {
        make: true,
      },
      distinct: ['make'],
      orderBy: {
        make: 'asc',
      },
    });

    const makes = cars.map(car => car.make);

    return {
      success: true,
      data: makes,
    };
  } catch (error) {
    console.error("Error fetching car makes:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get all featured brands (public - no auth required)
export const getFeaturedBrands = unstable_cache(
  async () => {
    try {
      const brands = await db.featuredBrand.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      return {
        success: true,
        data: brands,
      };
    } catch (error) {
      console.warn("[getFeaturedBrands] Prisma failed, using Supabase:", error.message);
      return getFeaturedBrandsSupabase();
    }
  },
  ["home-featured-brands-v2"],
  { revalidate: 3600, tags: ["brands"] }
);

// Get all featured brands for admin (includes inactive)
export async function getAllFeaturedBrandsAdmin(search = "") {
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

    const brands = await db.featuredBrand.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: brands,
    };
  } catch (error) {
    console.error("Error fetching featured brands for admin:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Create new featured brand
export async function createFeaturedBrand({ name, nameAr, image, order }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const brandId = uuidv4();
    let imageUrl = "";

    // Handle image upload if provided
    if (image && image.startsWith("data:image/")) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const base64 = image.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      const mimeMatch = image.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtension = mimeMatch ? mimeMatch[1] : "png";

      const fileName = `brand-${Date.now()}.${fileExtension}`;
      const filePath = `brands/${fileName}`;

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

    const brand = await db.featuredBrand.create({
      data: {
        id: brandId,
        name,
        nameAr,
        image: imageUrl,
        order: order || 0,
        isActive: true,
      },
    });

    revalidatePath("/admin/featured-brands");
    revalidatePath("/");

    return {
      success: true,
      data: brand,
    };
  } catch (error) {
    console.error("Error creating featured brand:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update featured brand
export async function updateFeaturedBrand(id, { name, nameAr, image, order, isActive }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    // Get existing brand to get old image URL
    const existingBrand = await db.featuredBrand.findUnique({
      where: { id },
    });

    if (!existingBrand) {
      throw new Error("Brand not found");
    }

    let imageUrl = existingBrand.image;

    // Handle new image upload if provided
    if (image && image.startsWith("data:image/")) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      // Delete old image if it's in our storage
      if (existingBrand.image && existingBrand.image.includes("car-images/brands/")) {
        try {
          const oldImagePath = existingBrand.image.split("car-images/")[1];
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

      const fileName = `brand-${Date.now()}.${fileExtension}`;
      const filePath = `brands/${fileName}`;

      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`,
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`;
    } else if (image && image !== existingBrand.image) {
      imageUrl = image; // Use new URL if provided
    }

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (nameAr !== undefined) updatedData.nameAr = nameAr;
    if (imageUrl !== undefined) updatedData.image = imageUrl;
    if (order !== undefined) updatedData.order = order;
    if (isActive !== undefined) updatedData.isActive = isActive;

    const brand = await db.featuredBrand.update({
      where: { id },
      data: updatedData,
    });

    revalidatePath("/admin/featured-brands");
    revalidatePath("/");

    return {
      success: true,
      data: brand,
    };
  } catch (error) {
    console.error("Error updating featured brand:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete featured brand
export async function deleteFeaturedBrand(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const brand = await db.featuredBrand.findUnique({
      where: { id },
    });

    if (!brand) {
      return {
        success: false,
        error: "Brand not found",
      };
    }

    // Delete the brand
    await db.featuredBrand.delete({
      where: { id },
    });

    // Delete image from storage if it's in our storage
    if (brand.image && brand.image.includes("car-images/brands/")) {
      try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const imagePath = brand.image.split("car-images/")[1];
        await supabase.storage.from("car-images").remove([imagePath]);
      } catch (storageError) {
        console.error("Error deleting brand image:", storageError);
      }
    }

    revalidatePath("/admin/featured-brands");
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting featured brand:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Toggle brand active status
export async function toggleFeaturedBrandStatus(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin access required");
    }

    const brand = await db.featuredBrand.findUnique({
      where: { id },
    });

    if (!brand) {
      return {
        success: false,
        error: "Brand not found",
      };
    }

    const updatedBrand = await db.featuredBrand.update({
      where: { id },
      data: { isActive: !brand.isActive },
    });

    revalidatePath("/admin/featured-brands");
    revalidatePath("/");

    return {
      success: true,
      data: updatedBrand,
    };
  } catch (error) {
    console.error("Error toggling brand status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
