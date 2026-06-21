import { PrismaClient } from "../src/generated/prisma/index.js";

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

const db = new PrismaClient();

try {
  const aboutPage = await db.aboutPage.findFirst({
    include: { features: true },
  });

  if (!aboutPage) {
    console.error("No AboutPage record found. Run scripts/seed-about-page.sql first.");
    process.exit(1);
  }

  if (!aboutPage.whyUsTitle?.trim()) {
    await db.aboutPage.update({
      where: { id: aboutPage.id },
      data: { whyUsTitle: "لماذا يختار العملاء ماكس موتورز؟" },
    });
    console.log("Set whyUsTitle on AboutPage.");
  }

  if (aboutPage.features.length > 0) {
    const seen = new Set();
    const duplicateIds = [];
    for (const feature of aboutPage.features) {
      const key = `${feature.order}|${feature.title}`;
      if (seen.has(key)) duplicateIds.push(feature.id);
      else seen.add(key);
    }

    if (duplicateIds.length > 0) {
      await db.aboutFeature.deleteMany({ where: { id: { in: duplicateIds } } });
      console.log(`Removed ${duplicateIds.length} duplicate feature(s).`);
    } else {
      console.log(`AboutPage already has ${aboutPage.features.length} feature(s). Skipping insert.`);
    }
    process.exit(0);
  }

  await db.aboutFeature.createMany({
    data: DEFAULT_ABOUT_FEATURES.map((feature) => ({
      ...feature,
      aboutPageId: aboutPage.id,
      isActive: true,
    })),
  });

  console.log(`Added ${DEFAULT_ABOUT_FEATURES.length} default features to AboutPage ${aboutPage.id}.`);
} catch (error) {
  console.error("Failed to seed about features:", error);
  process.exit(1);
} finally {
  await db.$disconnect();
}
