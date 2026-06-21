-- Add default "لماذا يختار العملاء ماكس موتورز؟" features if none exist
-- Run in Supabase SQL Editor or: psql $DATABASE_URL -f scripts/seed-about-features.sql

UPDATE "AboutPage"
SET "whyUsTitle" = COALESCE(NULLIF(TRIM("whyUsTitle"), ''), 'لماذا يختار العملاء ماكس موتورز؟')
WHERE "whyUsTitle" IS NULL OR TRIM("whyUsTitle") = '';

INSERT INTO "AboutFeature" ("id", "aboutPageId", "title", "description", "icon", "order", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p."id",
  f.title,
  f.description,
  f.icon,
  f."order",
  true,
  NOW(),
  NOW()
FROM "AboutPage" p
CROSS JOIN (
  VALUES
    ('دقة في البحث', 'استخدام خوارزميات الذكاء الاصطناعي لفرز آلاف السيارات واقتراح الأنسب لك.', 'Target', 1),
    ('فريق متخصص', 'خبراء فنيين ومستشارين ماليين متاحين لمساعدتك في اتخاذ القرار الصحيح.', 'Users', 2),
    ('جودة مضمونة', 'نتعامل فقط مع وكالات معتمدة وبائعين وموثقين لضمان سلامة سيارتك.', 'Award', 3),
    ('رضا العملاء', 'أكثر من 10,000 عميل سعيد وجدوا سيارات أحلامهم عبر منصتنا.', 'Heart', 4)
) AS f(title, description, icon, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM "AboutFeature" af WHERE af."aboutPageId" = p."id"
);
