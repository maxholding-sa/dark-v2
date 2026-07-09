import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request) {
  try {
    let heroSection = null;
    
    try {
      heroSection = await db.heroSection.findFirst({
        where: { isActive: true },
      });
    } catch (dbError) {
      logger.error("[Hero API] Database error", dbError);
    }

    if (!heroSection) {
      logger.info("[Hero API] No active hero section found, creating default");
      // Try to create a default one if it doesn't exist
      try {
        heroSection = await db.heroSection.create({
          data: {
            videoUrl: "/hero1.mp4",
            title: "مرحباً بك",
            subtitle: "بحث ذكي عن السيارات واختبار القيادة من بين مئات المركبات.",
            posterImage: null,
            isActive: true,
            autoplay: true,
            loop: true,
            muted: true,
          },
        });
        logger.info("[Hero API] Created default hero section");
      } catch (createError) {
        logger.error("[Hero API] Could not create default", createError);
        // Return fallback if creation fails
        return NextResponse.json(
          {
            success: true,
            data: {
              videoUrl: "/hero1.mp4",
              title: "مرحباً بك",
              subtitle: "بحث ذكي عن السيارات واختبار القيادة من بين مئات المركبات.",
              posterImage: null,
              isActive: true,
              autoplay: true,
              loop: true,
              muted: true,
            },
          },
          { status: 200 }
        );
      }
    }

    logger.debug("[Hero API] Returning hero section", {
      title: heroSection.title,
      videoUrl: heroSection.videoUrl,
    });

    return NextResponse.json({ success: true, data: heroSection }, { status: 200 });
  } catch (error) {
    logger.error("[Hero API] Unexpected error", error);
    
    // Return fallback instead of error
    return NextResponse.json(
      {
        success: true,
        data: {
          videoUrl: "/hero1.mp4",
          title: "مرحباً بك",
          subtitle: "بحث ذكي عن السيارات واختبار القيادة من بين مئات المركبات.",
          posterImage: null,
          isActive: true,
          autoplay: true,
          loop: true,
          muted: true,
        },
      },
      { status: 200 }
    );
  }
}
