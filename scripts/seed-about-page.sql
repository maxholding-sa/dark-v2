-- Seed structured About page content (ماكس موتورز)
-- Run in Supabase SQL Editor or: psql $DATABASE_URL -f scripts/seed-about-page.sql

DELETE FROM "AboutFeature";
DELETE FROM "AboutPage";

INSERT INTO "AboutPage" (
  "id",
  "title",
  "introText",
  "visionTitle",
  "visionParagraph1",
  "visionParagraph2",
  "visionImage",
  "visionImageAlt",
  "missionTitle",
  "missionParagraph1",
  "missionParagraph2",
  "missionImage",
  "missionImageAlt",
  "whyUsTitle",
  "ctaTitle",
  "ctaText",
  "isPublished",
  "metaDescription",
  "metaKeywords",
  "createdAt",
  "updatedAt"
) VALUES (
  'about-page-default',
  'من نحن',
  'ماكس موتورز هي المنصة الرائدة في المنطقة للبحث عن السيارات باستخدام تقنية الذكاء الاصطناعي. نحن نجمع بين الخبرة العريقة في سوق السيارات والتكنولوجيا المتطورة لنوفر لعملائنا تجربة شراء فريدة، شفافة، وآمنة تماماً.',
  'رؤيتنا',
  'رؤيتنا هي أن نصبح الوجهة الأولى والموثوقة في المنطقة لكل من يرغب في شراء أو بيع سيارة، من خلال بناء منظومة رقمية تعتمد على البيانات والذكاء الاصطناعي لتبسيط اتخاذ القرار.',
  'نسعى دائماً للابتكار وتحويل عملية امتلاك السيارة من مهمة شاقة إلى تجربة ممتعة ومضمونة النتائج.',
  '/about-saudi-vision.jpg',
  'أفق الرياض مع برج المملكة - السعودية',
  'رسالتنا',
  'تكمن رسالتنا في تمكين المستخدم من الوصول إلى "السيارة المثالية" من خلال توفير أدوات بحث ذكية، تقارير شفافة، وفريق دعم محترف يرافق العميل في كافة اشتراطات الفحص والتمويل.',
  'الالتزام بالجودة والدقة هو جوهر خدماتنا، لأن ثقة العملاء هي رأس مالنا الحقيقي.',
  '/about-saudi-mission.jpg',
  'الحِجر (مدائن صالح) في العلا - السعودية',
  'لماذا يختار العملاء ماكس موتورز؟',
  'هل أنت مستعد للعثور على سيارتك؟',
  'انضم إلى آلاف المستخدمين الذين يثقون في ماكس موتورز للوصول إلى أفضل العروض المتاحة.',
  true,
  'تعرف على ماكس موتورز - المنصة الرائدة للبحث عن السيارات بالذكاء الاصطناعي في المنطقة.',
  'ماكس موتورز, سيارات, ذكاء اصطناعي, شراء سيارات, السعودية',
  NOW(),
  NOW()
);

INSERT INTO "AboutFeature" ("id", "aboutPageId", "title", "description", "icon", "order", "isActive", "createdAt", "updatedAt") VALUES
  ('about-feature-1', 'about-page-default', 'دقة في البحث', 'استخدام خوارزميات الذكاء الاصطناعي لفرز آلاف السيارات واقتراح الأنسب لك.', 'Target', 1, true, NOW(), NOW()),
  ('about-feature-2', 'about-page-default', 'فريق متخصص', 'خبراء فنيين ومستشارين ماليين متاحين لمساعدتك في اتخاذ القرار الصحيح.', 'Users', 2, true, NOW(), NOW()),
  ('about-feature-3', 'about-page-default', 'جودة مضمونة', 'نتعامل فقط مع وكالات معتمدة وبائعين وموثقين لضمان سلامة سيارتك.', 'Award', 3, true, NOW(), NOW()),
  ('about-feature-4', 'about-page-default', 'رضا العملاء', 'أكثر من 10,000 عميل سعيد وجدوا سيارات أحلامهم عبر منصتنا.', 'Heart', 4, true, NOW(), NOW());
