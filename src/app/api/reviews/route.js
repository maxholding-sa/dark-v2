import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/superbase";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

// function to convert File to Base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

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

    logger.debug("[reviews-api] Reviews fetched", { count: reviews.length });

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    logger.error("[reviews-api] Error while getting reviews", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // check if user is logged in
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();

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
        .from("car-images")
        .upload(videoFilePath, videoBuffer, {
          contentType: videoFile.type,
        });

      if (videoError) {
        logger.error("[reviews-api] Error uploading video", videoError);
        return NextResponse.json(
          { error: `Failed to upload video: ${videoError.message}` },
          { status: 500 }
        );
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
        .from("car-images")
        .upload(imageFilePath, imageBuffer, {
          contentType: imageFile.type,
        });

      if (imageError) {
        logger.error("[reviews-api] Error uploading image", imageError);
        return NextResponse.json(
          { error: `Failed to upload image: ${imageError.message}` },
          { status: 500 }
        );
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

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    logger.error("[reviews-api] Error while adding review", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
