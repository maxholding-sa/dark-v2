"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { db, withDbRetry } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/superbase";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// ==================== FILE UPLOAD HELPERS ====================

export async function uploadFile(file, folder = "site-data") {
  try {
    const user = await getAuthenticatedUser();

    if (!file || file.size === 0) {
      return { success: false, error: "لم يتم توفير ملف" };
    }

    // Check file size (max 150MB for videos)
    const maxSize = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSize) {
      return { success: false, error: `حجم الملف كبير جداً. الحد الأقصى 150MB (الحجم الحالي: ${(file.size / 1024 / 1024).toFixed(2)}MB)` };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get file extension
    const fileExtension = file.name.split(".").pop() || file.type.split("/")[1] || "bin";
    const fileName = `${folder}-${Date.now()}-${uuidv4()}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`[uploadFile] Starting upload for ${fileName}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}`);

    // Convert file to buffer - this handles the file properly
    const fileBuffer = await file.arrayBuffer();

    // Upload with timeout
    const uploadPromise = supabase.storage
      .from("car-images")
      .upload(filePath, new Uint8Array(fileBuffer), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
        duplex: 'half',
      });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("مهلة الرفع انتهت - Upload timeout")), 10 * 60 * 1000) // 10 minutes
    );

    const { data, error: uploadError } = await Promise.race([
      uploadPromise,
      timeoutPromise,
    ]);

    if (uploadError) {
      console.error("[uploadFile] Supabase error:", uploadError);
      return { success: false, error: `خطأ في الرفع: ${uploadError.message}` };
    }

    if (!data || !data.path) {
      console.error("[uploadFile] No data returned from upload");
      return { success: false, error: "فشل الرفع: لم يتم الحصول على رد من الخادم" };
    }

    const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${data.path}`;

    console.log(`[uploadFile] Successfully uploaded: ${fileName} to ${data.path}`);
    return { success: true, url: fileUrl, filePath: data.path };
  } catch (error) {
    console.error("[uploadFile] Exception:", error);
    const errorMessage = error.message || "خطأ غير متوقع";
    return { success: false, error: `خطأ: ${errorMessage}` };
  }
}

export async function deleteFile(filePath) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error: deleteError } = await supabase.storage
      .from("car-images")
      .remove([filePath]);

    if (deleteError) {
      console.error("Error deleting file:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return { success: false, error: error.message };
  }
}

// ==================== SERIALIZATION HELPERS ====================

function serializeDates(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeDates);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeDates(entry)])
    );
  }
  return value;
}

// ==================== SOCIAL MEDIA MANAGEMENT ====================

export async function getSocialMediaLinks() {
  try {
    const socialMedia = await withDbRetry(() =>
      db.socialMedia.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    );
    return { success: true, data: serializeDates(socialMedia) };
  } catch (error) {
    console.error("Error fetching social media:", error);
    return { success: false, error: error.message };
  }
}

export async function createSocialMediaLink(data) {
  try {
    const user = await getAuthenticatedUser();

    const socialMedia = await db.socialMedia.create({
      data: {
        platform: data.platform,
        url: data.url,
        icon: data.icon || null,
        order: data.order || 0,
        isActive: data.isActive !== false,
      },
    });

    revalidatePath("/admin/site-management/social-media");
    return { success: true, data: socialMedia };
  } catch (error) {
    console.error("Error creating social media link:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSocialMediaLink(id, data) {
  try {
    const user = await getAuthenticatedUser();

    const socialMedia = await db.socialMedia.update({
      where: { id },
      data: {
        platform: data.platform,
        url: data.url,
        icon: data.icon || null,
        order: data.order,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/site-management/social-media");
    return { success: true, data: socialMedia };
  } catch (error) {
    console.error("Error updating social media link:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSocialMediaLink(id) {
  try {
    const user = await getAuthenticatedUser();

    await db.socialMedia.delete({
      where: { id },
    });

    revalidatePath("/admin/site-management/social-media");
    return { success: true };
  } catch (error) {
    console.error("Error deleting social media link:", error);
    return { success: false, error: error.message };
  }
}

// ==================== STORE INFO MANAGEMENT ====================

export async function getStoreInfo() {
  try {
    let storeInfo = await withDbRetry(() => db.storeInfo.findFirst());

    if (!storeInfo) {
      storeInfo = await withDbRetry(() =>
        db.storeInfo.create({
          data: {
            name: "maxmotors",
            description: "متخصصون في بيع السيارات",
            address: "الرياض، المملكة العربية السعودية",
            city: "الرياض",
            country: "السعودية",
            phone: "+966 123 456 789",
            email: "info@maxmotors.sa",
          },
        })
      );
    }

    return { success: true, data: serializeDates(storeInfo) };
  } catch (error) {
    console.error("Error fetching store info:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStoreInfo(data) {
  try {
    const user = await getAuthenticatedUser();

    let storeInfo = await db.storeInfo.findFirst();

    if (!storeInfo) {
      storeInfo = await db.storeInfo.create({
        data: {
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          country: data.country,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });
    } else {
      storeInfo = await db.storeInfo.update({
        where: { id: storeInfo.id },
        data: {
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          country: data.country,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });
    }

    // Also sync with DealershipInfo
    const dealership = await db.dealershipInfo.findFirst();
    if (dealership) {
      await db.dealershipInfo.update({
        where: { id: dealership.id },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
        },
      });
    }

    revalidatePath("/admin/site-management/store-info");
    revalidatePath("/admin/site-data");
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
    return { success: true, data: serializeDates(storeInfo) };
  } catch (error) {
    console.error("Error updating store info:", error);
    return { success: false, error: error.message };
  }
}

// ==================== LOGO MANAGEMENT ====================

export async function getLogos() {
  try {
    const logos = await withDbRetry(() =>
      db.logo.findMany({
        orderBy: { createdAt: "desc" },
      })
    );
    return { success: true, data: serializeDates(logos) };
  } catch (error) {
    console.error("Error fetching logos:", error);
    return { success: false, error: error.message };
  }
}

export async function getActiveLogo() {
  try {
    const logo = await withDbRetry(() =>
      db.logo.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      })
    );
    return { success: true, data: serializeDates(logo) };
  } catch (error) {
    console.error("Error fetching active logo:", error);
    return { success: false, error: error.message };
  }
}

export async function getLogoByType(type) {
  try {
    const logo = await withDbRetry(() =>
      db.logo.findFirst({
        where: { type, isActive: true },
        orderBy: { createdAt: "desc" },
      })
    );
    return { success: true, data: serializeDates(logo) };
  } catch (error) {
    console.error(`Error fetching ${type} logo:`, error);
    return { success: false, error: error.message };
  }
}

export async function createLogo(data) {
  try {
    const user = await getAuthenticatedUser();

    // If this is the first logo or if we want to set it as active, deactivate others of the same type
    if (data.isActive) {
      await db.logo.updateMany({
        where: { type: data.type },
        data: { isActive: false },
      });
    }

    const logo = await db.logo.create({
      data: {
        imageUrl: data.imageUrl,
        altText: data.altText || "Company Logo",
        type: data.type || "main",
        isActive: data.isActive !== false,
      },
    });

    revalidatePath("/admin/site-management/logo");
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
    revalidateTag("logos");
    return { success: true, data: serializeDates(logo) };
  } catch (error) {
    console.error("Error creating logo:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLogo(id, data) {
  try {
    const user = await getAuthenticatedUser();

    // If setting as active, deactivate others of the same type
    if (data.isActive) {
      const logo = await db.logo.findUnique({ where: { id } });
      if (logo) {
        await db.logo.updateMany({
          where: { type: logo.type, id: { not: id } },
          data: { isActive: false },
        });
      }
    }

    const updatedLogo = await db.logo.update({
      where: { id },
      data: {
        imageUrl: data.imageUrl,
        altText: data.altText,
        type: data.type,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/site-management/logo");
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
    revalidateTag("logos");
    return { success: true, data: serializeDates(updatedLogo) };
  } catch (error) {
    console.error("Error updating logo:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteLogo(id) {
  try {
    const user = await getAuthenticatedUser();

    await db.logo.delete({
      where: { id },
    });

    revalidatePath("/admin/site-management/logo");
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
    revalidateTag("logos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting logo:", error);
    return { success: false, error: error.message };
  }
}

// ==================== ABOUT PAGE MANAGEMENT ====================

export async function getAboutPage() {
  try {
    let aboutPage = await withDbRetry(() => db.aboutPage.findFirst());

    if (!aboutPage) {
      aboutPage = await withDbRetry(() =>
        db.aboutPage.create({
          data: {
            title: "عن المتجر",
            content: "<p>محتوى صفحة عن المتجر</p>",
            isPublished: true,
          },
        })
      );
    }

    return { success: true, data: serializeDates(aboutPage) };
  } catch (error) {
    console.error("Error fetching about page:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAboutPage(data) {
  try {
    const user = await getAuthenticatedUser();

    let aboutPage = await db.aboutPage.findFirst();

    if (!aboutPage) {
      aboutPage = await db.aboutPage.create({
        data: {
          title: data.title,
          content: data.content,
          heroImage: data.heroImage,
          isPublished: data.isPublished !== false,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
        },
      });
    } else {
      aboutPage = await db.aboutPage.update({
        where: { id: aboutPage.id },
        data: {
          title: data.title,
          content: data.content,
          heroImage: data.heroImage,
          isPublished: data.isPublished,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
        },
      });
    }

    revalidatePath("/admin/site-management/about-page");
    revalidatePath("/about");
    return { success: true, data: aboutPage };
  } catch (error) {
    console.error("Error updating about page:", error);
    return { success: false, error: error.message };
  }
}

// ==================== HERO SECTION MANAGEMENT ====================

export async function getHeroSection() {
  try {
    let heroSection = await withDbRetry(() => db.heroSection.findFirst());

    if (!heroSection) {
      heroSection = await withDbRetry(() =>
        db.heroSection.create({
          data: {
            videoUrl: "",
            title: "مرحباً بك",
            subtitle: "",
            isActive: true,
            autoplay: true,
            loop: true,
            muted: true,
          },
        })
      );
    }

    return { success: true, data: serializeDates(heroSection) };
  } catch (error) {
    console.error("Error fetching hero section:", error);
    return { success: false, error: error.message };
  }
}

export async function updateHeroSection(data) {
  try {
    const user = await getAuthenticatedUser();

    let heroSection = await db.heroSection.findFirst();

    if (!heroSection) {
      heroSection = await db.heroSection.create({
        data: {
          videoUrl: data.videoUrl,
          title: data.title || "مرحباً بك",
          subtitle: data.subtitle,
          posterImage: data.posterImage,
          isActive: data.isActive !== false,
          autoplay: data.autoplay !== false,
          loop: data.loop !== false,
          muted: data.muted !== false,
        },
      });
    } else {
      heroSection = await db.heroSection.update({
        where: { id: heroSection.id },
        data: {
          videoUrl: data.videoUrl,
          title: data.title,
          subtitle: data.subtitle,
          posterImage: data.posterImage,
          isActive: data.isActive,
          autoplay: data.autoplay,
          loop: data.loop,
          muted: data.muted,
        },
      });
    }

    revalidatePath("/admin/site-data");
    revalidatePath("/");
    revalidateTag("site-settings");
    return { success: true, data: serializeDates(heroSection) };
  } catch (error) {
    console.error("Error updating hero section:", error);
    return { success: false, error: error.message };
  }
}

// ==================== WHATSAPP NUMBER ====================

export async function getWhatsAppNumber() {
  try {
    const storeInfo = await withDbRetry(() =>
      db.storeInfo.findFirst({
        select: { whatsapp: true },
      })
    );

    if (!storeInfo || !storeInfo.whatsapp) {
      return { success: false, data: null };
    }

    return { success: true, data: storeInfo.whatsapp };
  } catch (error) {
    console.error("Error fetching WhatsApp number:", error);
    return { success: false, data: null };
  }
}

// ==================== PIXEL & ANALYTICS MANAGEMENT ====================

export async function getPixelSettings() {
  try {
    let pixelSettings = await withDbRetry(() => db.pixelSettings.findFirst());

    if (!pixelSettings) {
      pixelSettings = await withDbRetry(() =>
        db.pixelSettings.create({
          data: {},
        })
      );
    }

    return { success: true, data: serializeDates(pixelSettings) };
  } catch (error) {
    console.error("Error fetching pixel settings:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePixelSettings(data) {
  try {
    const user = await getAuthenticatedUser();

    // Safety check for admin role
    if (!user || user.role !== "ADMIN") {
      console.warn(`[updatePixelSettings] Unauthorized attempt by user: ${user?.email || 'Anonymous'}`);
      return { success: false, error: "غير مصرح لك بالقيام بهذا الإجراء" };
    }

    console.log("[updatePixelSettings] Updating with data:", data);

    let pixelSettings = await db.pixelSettings.findFirst();

    const updateData = {
      facebookPixel: data.facebookPixel,
      googleAnalytics: data.googleAnalytics,
      googleAdsId: data.googleAdsId,
      tiktokPixel: data.tiktokPixel,
      snapchatPixel: data.snapchatPixel,
      microsoftClarity: data.microsoftClarity,
    };

    // Remove undefined values to avoid overwriting with null if a field wasn't provided
    Object.keys(updateData).forEach(key =>
      updateData[key] === undefined && delete updateData[key]
    );

    if (!pixelSettings) {
      pixelSettings = await db.pixelSettings.create({
        data: updateData,
      });
    } else {
      pixelSettings = await db.pixelSettings.update({
        where: { id: pixelSettings.id },
        data: updateData,
      });
    }

    console.log("[updatePixelSettings] Successfully updated record:", pixelSettings.id);

    revalidateTag("pixels");
    revalidateTag("site-settings");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: true, data: pixelSettings };
  } catch (error) {
    console.error("[updatePixelSettings] Error:", error);
    return { success: false, error: `فشل الحفظ: ${error.message}` };
  }
}
