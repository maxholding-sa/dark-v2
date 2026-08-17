"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { db, withDbRetry } from "@/lib/prisma";
import {
  getHeroSectionSupabase,
  getLogoByTypeSupabase,
  getWhatsAppNumberSupabase,
  getPixelSettingsSupabase,
  getFooterDataSupabase,
} from "@/lib/supabaseReads";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/lib/superbase";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

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

    logger.debug("[uploadFile] Starting upload", {
      fileName,
      sizeMb: (file.size / 1024 / 1024).toFixed(2),
      type: file.type,
    });

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

    logger.info("[uploadFile] Upload completed", { fileName });
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
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
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
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
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
    revalidatePath("/", "layout");
    revalidateTag("site-settings");
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

    const storeInfoFields = {
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
      whatsappEnabled: data.whatsappEnabled !== undefined ? data.whatsappEnabled : true,
      whatsappLabel: data.whatsappLabel || null,
      whatsappText: data.whatsappText || null,
    };

    if (!storeInfo) {
      storeInfo = await db.storeInfo.create({ data: storeInfoFields });
    } else {
      storeInfo = await db.storeInfo.update({
        where: { id: storeInfo.id },
        data: storeInfoFields,
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

// Read by the root layout on every request (navbar + footer logos), so an
// uncached version costs two DB round trips per page view. The logo mutations
// below already revalidate the "logos" tag.
export const getLogoByType = unstable_cache(
  async (type) => {
    try {
      const logo = await withDbRetry(() =>
        db.logo.findFirst({
          where: { type, isActive: true },
          orderBy: { createdAt: "desc" },
        })
      );
      return { success: true, data: serializeDates(logo) };
    } catch (error) {
      console.warn(`[getLogoByType] Prisma failed, using Supabase:`, error.message);
      try {
        const result = await getLogoByTypeSupabase(type);
        return { ...result, data: serializeDates(result.data) };
      } catch (fallbackError) {
        console.error(`Error fetching ${type} logo:`, fallbackError);
        return { success: false, error: fallbackError.message };
      }
    }
  },
  ["site-logo-by-type"],
  { revalidate: 3600, tags: ["logos", "site-settings"] }
);

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

const DEFAULT_ABOUT_FEATURES = [
  {
    title: "دقة في البحث",
    description: "استخدام خوارزميات الذكاء الاصطناعي لفرز آلاف السيارات واقتراح الأنسب لك.",
    icon: "Target",
    order: 1,
  },
  {
    title: "فريق متخصص",
    description: "خبراء فنيين ومستشارين ماليين متاحين لمساعدتك في اتخاذ القرار الصحيح.",
    icon: "Users",
    order: 2,
  },
  {
    title: "جودة مضمونة",
    description: "نتعامل فقط مع وكالات معتمدة وبائعين وموثقين لضمان سلامة سيارتك.",
    icon: "Award",
    order: 3,
  },
  {
    title: "رضا العملاء",
    description: "أكثر من 10,000 عميل سعيد وجدوا سيارات أحلامهم عبر منصتنا.",
    icon: "Heart",
    order: 4,
  },
];

const DEFAULT_ABOUT_PAGE = {
  title: "من نحن",
  introText:
    "ماكس موتورز هي المنصة الرائدة في المنطقة للبحث عن السيارات باستخدام تقنية الذكاء الاصطناعي. نحن نجمع بين الخبرة العريقة في سوق السيارات والتكنولوجيا المتطورة لنوفر لعملائنا تجربة شراء فريدة، شفافة، وآمنة تماماً.",
  visionTitle: "رؤيتنا",
  visionParagraph1:
    "رؤيتنا هي أن نصبح الوجهة الأولى والموثوقة في المنطقة لكل من يرغب في شراء أو بيع سيارة، من خلال بناء منظومة رقمية تعتمد على البيانات والذكاء الاصطناعي لتبسيط اتخاذ القرار.",
  visionParagraph2:
    "نسعى دائماً للابتكار وتحويل عملية امتلاك السيارة من مهمة شاقة إلى تجربة ممتعة ومضمونة النتائج.",
  visionImage: "/about-saudi-vision.jpg",
  visionImageAlt: "أفق الرياض مع برج المملكة - السعودية",
  missionTitle: "رسالتنا",
  missionParagraph1:
    'تكمن رسالتنا في تمكين المستخدم من الوصول إلى "السيارة المثالية" من خلال توفير أدوات بحث ذكية، تقارير شفافة، وفريق دعم محترف يرافق العميل في كافة اشتراطات الفحص والتمويل.',
  missionParagraph2:
    "الالتزام بالجودة والدقة هو جوهر خدماتنا، لأن ثقة العملاء هي رأس مالنا الحقيقي.",
  missionImage: "/about-saudi-mission.jpg",
  missionImageAlt: "الحِجر (مدائن صالح) في العلا - السعودية",
  whyUsTitle: "لماذا يختار العملاء ماكس موتورز؟",
  ctaTitle: "هل أنت مستعد للعثور على سيارتك؟",
  ctaText:
    "انضم إلى آلاف المستخدمين الذين يثقون في ماكس موتورز للوصول إلى أفضل العروض المتاحة.",
  isPublished: true,
  metaDescription:
    "تعرف على ماكس موتورز - المنصة الرائدة للبحث عن السيارات بالذكاء الاصطناعي في المنطقة.",
  metaKeywords: "ماكس موتورز, سيارات, ذكاء اصطناعي, شراء سيارات, السعودية",
};

function supportsAboutFeatures() {
  return typeof db.aboutFeature?.findMany === "function";
}

function aboutFeaturesInclude(forAdmin = false) {
  if (!supportsAboutFeatures()) return undefined;
  return {
    features: {
      ...(forAdmin ? {} : { where: { isActive: true } }),
      orderBy: { order: "asc" },
    },
  };
}

async function findAboutPageRecord(forAdmin = false) {
  const include = aboutFeaturesInclude(forAdmin);
  const aboutPage = await db.aboutPage.findFirst(include ? { include } : undefined);
  if (!aboutPage) return null;
  return { ...aboutPage, features: aboutPage.features ?? [] };
}

async function ensureDefaultAboutFeatures(aboutPageId) {
  if (!supportsAboutFeatures() || !aboutPageId) return;

  const count = await db.aboutFeature.count({ where: { aboutPageId } });
  if (count > 0) return;

  await db.aboutFeature.createMany({
    data: DEFAULT_ABOUT_FEATURES.map((feature) => ({
      ...feature,
      aboutPageId,
      isActive: true,
    })),
  });
}

async function fetchAboutPage(forAdmin) {
  try {
    let aboutPage = await withDbRetry(() => findAboutPageRecord(forAdmin));

    if (!aboutPage) {
      const createData = {
        ...DEFAULT_ABOUT_PAGE,
        ...(supportsAboutFeatures()
          ? { features: { create: DEFAULT_ABOUT_FEATURES } }
          : {}),
      };
      aboutPage = await withDbRetry(async () => {
        const created = await db.aboutPage.create({
          data: createData,
          ...(aboutFeaturesInclude(forAdmin)
            ? { include: aboutFeaturesInclude(forAdmin) }
            : {}),
        });
        return { ...created, features: created.features ?? [] };
      });
    } else if (!aboutPage.features?.length) {
      await withDbRetry(() => ensureDefaultAboutFeatures(aboutPage.id));
      aboutPage = await withDbRetry(() => findAboutPageRecord(forAdmin));
    }

    return { success: true, data: serializeDates(aboutPage) };
  } catch (error) {
    console.error("Error fetching about page:", error);
    return { success: false, error: error.message };
  }
}

// The root layout reads this on every request just for the nav label, and /about
// renders it in full. Only the public shape is cached — the admin editor must
// see its own writes immediately, including inactive features.
const getPublicAboutPage = unstable_cache(
  async () => fetchAboutPage(false),
  ["site-about-page"],
  { revalidate: 3600, tags: ["about-page", "site-settings"] }
);

export async function getAboutPage({ forAdmin = false } = {}) {
  return forAdmin ? fetchAboutPage(true) : getPublicAboutPage();
}

export async function updateAboutPage(data) {
  try {
    await getAuthenticatedUser();

    let aboutPage = await db.aboutPage.findFirst();

    const pageData = {
      title: data.title,
      introText: data.introText,
      visionTitle: data.visionTitle,
      visionParagraph1: data.visionParagraph1,
      visionParagraph2: data.visionParagraph2,
      visionImage: data.visionImage,
      visionImageAlt: data.visionImageAlt,
      missionTitle: data.missionTitle,
      missionParagraph1: data.missionParagraph1,
      missionParagraph2: data.missionParagraph2,
      missionImage: data.missionImage,
      missionImageAlt: data.missionImageAlt,
      whyUsTitle: data.whyUsTitle,
      ctaTitle: data.ctaTitle,
      ctaText: data.ctaText,
      isPublished: data.isPublished,
      metaDescription: data.metaDescription,
      metaKeywords: data.metaKeywords,
    };

    if (!aboutPage) {
      aboutPage = await db.aboutPage.create({
        data: {
          ...DEFAULT_ABOUT_PAGE,
          ...pageData,
          ...(supportsAboutFeatures()
            ? { features: { create: DEFAULT_ABOUT_FEATURES } }
            : {}),
        },
        ...(aboutFeaturesInclude(true) ? { include: aboutFeaturesInclude(true) } : {}),
      });
      aboutPage = { ...aboutPage, features: aboutPage.features ?? [] };
    } else {
      aboutPage = await db.aboutPage.update({
        where: { id: aboutPage.id },
        data: pageData,
        ...(aboutFeaturesInclude(true) ? { include: aboutFeaturesInclude(true) } : {}),
      });
      aboutPage = { ...aboutPage, features: aboutPage.features ?? [] };
    }

    revalidatePath("/admin/site-management/about-page");
    revalidatePath("/admin/site-data");
    revalidatePath("/about");
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidateTag("about-page");
    revalidateTag("site-settings");
    return { success: true, data: aboutPage };
  } catch (error) {
    console.error("Error updating about page:", error);
    return { success: false, error: error.message };
  }
}

export async function createAboutFeature(data) {
  try {
    await getAuthenticatedUser();

    if (!supportsAboutFeatures()) {
      return {
        success: false,
        error: "جدول المميزات غير متوفر. شغّل prisma generate ثم prisma db push وأعد تشغيل السيرفر.",
      };
    }

    let aboutPage = await db.aboutPage.findFirst();
    if (!aboutPage) {
      aboutPage = await db.aboutPage.create({
        data: {
          ...DEFAULT_ABOUT_PAGE,
          features: { create: DEFAULT_ABOUT_FEATURES },
        },
      });
    }

    const feature = await db.aboutFeature.create({
      data: {
        aboutPageId: aboutPage.id,
        title: data.title,
        description: data.description,
        icon: data.icon || "Target",
        order: data.order ?? 0,
        isActive: data.isActive !== false,
      },
    });

    revalidatePath("/admin/site-management/about-page");
    revalidatePath("/admin/site-data");
    revalidatePath("/about");
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidateTag("about-page");
    revalidateTag("site-settings");
    return { success: true, data: feature };
  } catch (error) {
    console.error("Error creating about feature:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAboutFeature(id, data) {
  try {
    await getAuthenticatedUser();

    if (!supportsAboutFeatures()) {
      return {
        success: false,
        error: "جدول المميزات غير متوفر. شغّل prisma generate ثم prisma db push وأعد تشغيل السيرفر.",
      };
    }

    const feature = await db.aboutFeature.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        order: data.order,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/site-management/about-page");
    revalidatePath("/admin/site-data");
    revalidatePath("/about");
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidateTag("about-page");
    revalidateTag("site-settings");
    return { success: true, data: feature };
  } catch (error) {
    console.error("Error updating about feature:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAboutFeature(id) {
  try {
    await getAuthenticatedUser();

    if (!supportsAboutFeatures()) {
      return {
        success: false,
        error: "جدول المميزات غير متوفر. شغّل prisma generate ثم prisma db push وأعد تشغيل السيرفر.",
      };
    }

    await db.aboutFeature.delete({ where: { id } });

    revalidatePath("/admin/site-management/about-page");
    revalidatePath("/admin/site-data");
    revalidatePath("/about");
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidateTag("about-page");
    revalidateTag("site-settings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting about feature:", error);
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
    console.warn("[getHeroSection] Prisma failed, using Supabase:", error.message);
    try {
      const result = await getHeroSectionSupabase();
      return { ...result, data: serializeDates(result.data) };
    } catch (fallbackError) {
      console.error("Error fetching hero section:", fallbackError);
      return { success: false, error: fallbackError.message };
    }
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
        select: {
          whatsapp: true,
          whatsappEnabled: true,
          whatsappLabel: true,
          whatsappText: true,
        },
      })
    );

    if (!storeInfo || !storeInfo.whatsapp) {
      return { success: false, data: null };
    }

    return {
      success: true,
      data: storeInfo.whatsapp,
      whatsappEnabled: storeInfo.whatsappEnabled ?? true,
      whatsappLabel: storeInfo.whatsappLabel || null,
      whatsappText: storeInfo.whatsappText || null,
    };
  } catch (error) {
    console.warn("[getWhatsAppNumber] Prisma failed, using Supabase:", error.message);
    try {
      return await getWhatsAppNumberSupabase();
    } catch (fallbackError) {
      console.error("Error fetching WhatsApp number:", fallbackError);
      return { success: false, data: null };
    }
  }
}

// ==================== PIXEL & ANALYTICS MANAGEMENT ====================

// Also read by the root layout on every request. updatePixelSettings
// revalidates the "pixels" tag.
export const getPixelSettings = unstable_cache(
  async () => {
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
      console.warn("[getPixelSettings] Prisma failed, using Supabase:", error.message);
      try {
        const result = await getPixelSettingsSupabase();
        return { ...result, data: serializeDates(result.data) };
      } catch (fallbackError) {
        console.error("Error fetching pixel settings:", fallbackError);
        return { success: false, error: fallbackError.message };
      }
    }
  },
  ["site-pixel-settings"],
  { revalidate: 3600, tags: ["pixels", "site-settings"] }
);

// Footer chrome for every page. The social-media and store-info mutations
// revalidate "site-settings".
export const getFooterData = unstable_cache(
  async () => {
    try {
      const { socialLinks, storeInfo } = await withDbRetry(async () => {
        const [socialLinks, storeInfo] = await Promise.all([
          db.socialMedia.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
          db.storeInfo.findFirst(),
        ]);
        return { socialLinks, storeInfo };
      });

      return {
        success: true,
        socialLinks: serializeDates(socialLinks),
        storeInfo: serializeDates(storeInfo),
      };
    } catch (error) {
      console.warn("[getFooterData] Prisma failed, using Supabase:", error.message);
      try {
        const data = await getFooterDataSupabase();
        return {
          success: true,
          socialLinks: serializeDates(data.socialLinks),
          storeInfo: serializeDates(data.storeInfo),
        };
      } catch (fallbackError) {
        console.error("Error fetching footer data:", fallbackError);
        return { success: false, socialLinks: [], storeInfo: null };
      }
    }
  },
  ["site-footer-data"],
  { revalidate: 3600, tags: ["site-settings"] }
);

export async function updatePixelSettings(data) {
  try {
    const user = await getAuthenticatedUser();

    // Safety check for admin role
    if (!user || user.role !== "ADMIN") {
      logger.warn("[updatePixelSettings] Unauthorized attempt", {
        hasUser: Boolean(user),
        role: user?.role,
      });
      return { success: false, error: "غير مصرح لك بالقيام بهذا الإجراء" };
    }

    logger.debug("[updatePixelSettings] Updating pixel settings", {
      fields: Object.keys(data || {}),
    });

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

    logger.info("[updatePixelSettings] Pixel settings updated", { id: pixelSettings.id });

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
