"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { createClient } from "@/lib/superbase";
import { cookies } from "next/headers";
import { unstable_cache, revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { getHomeReviewsSupabase } from "@/lib/supabaseReads";

// function to convert File to Base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

// addReview - create a new review
export async function addReview(formData) {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const reviewId = uuidv4();
    const folderPath = `reviews/${reviewId}`;

    // For file storage
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let videoUrl = null;
    let imageUrl = null;

    // Handle video upload
    const videoFile = formData.get("videoFile");
    if (videoFile && videoFile.size > 0) {
      const videoBase64 = await fileToBase64(videoFile);
      const videoBuffer = Buffer.from(videoBase64, "base64");
      const videoFileName = `video-${Date.now()}.${videoFile.type.split("/")[1]}`;
      const videoFilePath = `${folderPath}/${videoFileName}`;

      const { error: videoError } = await supabase.storage
        .from("car-images") // Using same bucket as cars
        .upload(videoFilePath, videoBuffer, {
          contentType: videoFile.type,
        });

      if (videoError) {
        console.error("Error uploading video:", videoError);
        throw new Error(`Failed to upload video: ${videoError.message}`);
      }

      videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${videoFilePath}`;
    }

    // Handle image upload
    const imageFile = formData.get("imageFile");
    if (imageFile && imageFile.size > 0) {
      const imageBase64 = await fileToBase64(imageFile);
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const imageFileName = `image-${Date.now()}.${imageFile.type.split("/")[1]}`;
      const imageFilePath = `${folderPath}/${imageFileName}`;

      const { error: imageError } = await supabase.storage
        .from("car-images") // Using same bucket as cars
        .upload(imageFilePath, imageBuffer, {
          contentType: imageFile.type,
        });

      if (imageError) {
        console.error("Error uploading image:", imageError);
        throw new Error(`Failed to upload image: ${imageError.message}`);
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${imageFilePath}`;
    }

    const review = await db.review.create({
      data: {
        id: reviewId,
        clientName: formData.get("clientName"),
        city: formData.get("city"),
        car: formData.get("car"),
        rating: parseInt(formData.get("rating")),
        videoUrl: videoUrl,
        imageUrl: imageUrl,
        reviewText: formData.get("reviewText"),
      },
    });

    revalidatePath("/admin/reviews");

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while adding review: ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// getHomeReviews - fetch limited reviews for homepage with caching
export const getHomeReviews = unstable_cache(
  async (limit = 3) => {
    try {
      const reviews = await db.review.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return reviews;
    } catch (error) {
      console.warn("[getHomeReviews] Prisma failed, using Supabase:", error.message);
      return getHomeReviewsSupabase(limit);
    }
  },
  ["home-reviews-list-v2"],
  { revalidate: 3600, tags: ["reviews"] }
);

// getReviews - fetch reviews from db
export async function getReviews(search = "") {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    let where = {};

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { car: { contains: search, mode: "insensitive" } },
        { reviewText: { contains: search, mode: "insensitive" } },
      ];
    }

    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: reviews,
    };
  } catch (error) {
    console.error(`Error while getting reviews from DB: ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// getReviewForEdit - fetch a single review for editing
export async function getReviewForEdit(reviewId) {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    return {
      success: true,
      data: review,
    };
  } catch (error) {
    console.error(`Error while getting review for edit: ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// updateReview - update an existing review
export async function updateReview(reviewId, formData) {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // check if the review exists
    const existingReview = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    const folderPath = `reviews/${reviewId}`;

    // For file storage
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let videoUrl = existingReview.videoUrl;
    let imageUrl = existingReview.imageUrl;

    // Handle video upload (only if new file provided)
    const videoFile = formData.videoFile;
    if (videoFile && videoFile.size > 0) {
      // Delete old video if exists
      if (existingReview.videoUrl) {
        try {
          const oldVideoUrl = new URL(existingReview.videoUrl);
          const oldVideoPathMatch = oldVideoUrl.pathname.match(/\/car-images\/(.*)/);
          if (oldVideoPathMatch) {
            await supabase.storage.from("car-images").remove([oldVideoPathMatch[1]]);
          }
        } catch (error) {
          console.error("Error deleting old video:", error);
        }
      }

      const videoBase64 = await fileToBase64(videoFile);
      const videoBuffer = Buffer.from(videoBase64, "base64");
      const videoFileName = `video-${Date.now()}.${videoFile.type.split("/")[1]}`;
      const videoFilePath = `${folderPath}/${videoFileName}`;

      const { error: videoError } = await supabase.storage
        .from("car-images")
        .upload(videoFilePath, videoBuffer, {
          contentType: videoFile.type,
        });

      if (videoError) {
        console.error("Error uploading video:", videoError);
        throw new Error(`Failed to upload video: ${videoError.message}`);
      }

      videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${videoFilePath}`;
    }

    // Handle image upload (only if new file provided)
    const imageFile = formData.imageFile;
    if (imageFile && imageFile.size > 0) {
      // Delete old image if exists
      if (existingReview.imageUrl) {
        try {
          const oldImageUrl = new URL(existingReview.imageUrl);
          const oldImagePathMatch = oldImageUrl.pathname.match(/\/car-images\/(.*)/);
          if (oldImagePathMatch) {
            await supabase.storage.from("car-images").remove([oldImagePathMatch[1]]);
          }
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }

      const imageBase64 = await fileToBase64(imageFile);
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const imageFileName = `image-${Date.now()}.${imageFile.type.split("/")[1]}`;
      const imageFilePath = `${folderPath}/${imageFileName}`;

      const { error: imageError } = await supabase.storage
        .from("car-images")
        .upload(imageFilePath, imageBuffer, {
          contentType: imageFile.type,
        });

      if (imageError) {
        console.error("Error uploading image:", imageError);
        throw new Error(`Failed to upload image: ${imageError.message}`);
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${imageFilePath}`;
    }

    const review = await db.review.update({
      where: { id: reviewId },
      data: {
        clientName: formData.clientName,
        city: formData.city,
        car: formData.car,
        rating: formData.rating,
        videoUrl: videoUrl,
        imageUrl: imageUrl,
        reviewText: formData.reviewText,
      },
    });

    revalidatePath("/admin/reviews");

    return {
      success: true,
      data: review,
    };
  } catch (error) {
    console.error(`Error while updating review: ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// deleteReview - delete review and its media from db
export async function deleteReview(reviewId) {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // check if the review exists
    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { videoUrl: true, imageUrl: true },
    });

    if (!review) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    // delete the review
    await db.review.delete({
      where: { id: reviewId },
    });

    // delete media files from storage if they exist
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const filePaths = [];

      if (review.videoUrl) {
        const videoUrl = new URL(review.videoUrl);
        const videoPathMatch = videoUrl.pathname.match(/\/car-images\/(.*)/);
        if (videoPathMatch) filePaths.push(videoPathMatch[1]);
      }

      if (review.imageUrl) {
        const imageUrl = new URL(review.imageUrl);
        const imagePathMatch = imageUrl.pathname.match(/\/car-images\/(.*)/);
        if (imagePathMatch) filePaths.push(imagePathMatch[1]);
      }

      if (filePaths.length > 0) {
        const { error } = await supabase.storage
          .from("car-images")
          .remove(filePaths);

        if (error) {
          console.error(`Error deleting review media: ${error}`);
        }
      }
    } catch (storageError) {
      console.error("Error while deleting review media: ", storageError);
    }

    revalidatePath("/admin/reviews");
    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error while deleting review: ${error}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
