-- Restructure AboutPage with vision/mission sections and images
-- CreateTable
CREATE TABLE "AboutFeature" (
    "id" TEXT NOT NULL,
    "aboutPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Target',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutFeature_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new columns (nullable first for data migration)
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "introText" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "visionTitle" TEXT DEFAULT 'رؤيتنا';
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "visionParagraph1" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "visionParagraph2" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "visionImage" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "visionImageAlt" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "missionTitle" TEXT DEFAULT 'رسالتنا';
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "missionParagraph1" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "missionParagraph2" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "missionImage" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "missionImageAlt" TEXT;
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "whyUsTitle" TEXT DEFAULT 'لماذا يختار العملاء ماكس موتورز؟';
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "ctaTitle" TEXT DEFAULT 'هل أنت مستعد للعثور على سيارتك؟';
ALTER TABLE "AboutPage" ADD COLUMN IF NOT EXISTS "ctaText" TEXT;

-- Migrate legacy content column to introText if present
UPDATE "AboutPage"
SET "introText" = COALESCE("introText", "content")
WHERE "introText" IS NULL AND "content" IS NOT NULL;

-- Drop legacy columns
ALTER TABLE "AboutPage" DROP COLUMN IF EXISTS "content";
ALTER TABLE "AboutPage" DROP COLUMN IF EXISTS "heroImage";

-- Update title default
ALTER TABLE "AboutPage" ALTER COLUMN "title" SET DEFAULT 'من نحن';

-- Set NOT NULL on required text fields with defaults for any existing rows
UPDATE "AboutPage" SET
  "introText" = COALESCE("introText", 'ماكس موتورز هي المنصة الرائدة في المنطقة للبحث عن السيارات باستخدام تقنية الذكاء الاصطناعي. نحن نجمع بين الخبرة العريقة في سوق السيارات والتكنولوجيا المتطورة لنوفر لعملائنا تجربة شراء فريدة، شفافة، وآمنة تماماً.'),
  "visionTitle" = COALESCE("visionTitle", 'رؤيتنا'),
  "visionParagraph1" = COALESCE("visionParagraph1", 'رؤيتنا هي أن نصبح الوجهة الأولى والموثوقة في المنطقة لكل من يرغب في شراء أو بيع سيارة، من خلال بناء منظومة رقمية تعتمد على البيانات والذكاء الاصطناعي لتبسيط اتخاذ القرار.'),
  "visionParagraph2" = COALESCE("visionParagraph2", 'نسعى دائماً للابتكار وتحويل عملية امتلاك السيارة من مهمة شاقة إلى تجربة ممتعة ومضمونة النتائج.'),
  "visionImage" = COALESCE("visionImage", '/about-saudi-vision.jpg'),
  "visionImageAlt" = COALESCE("visionImageAlt", 'أفق الرياض مع برج المملكة - السعودية'),
  "missionTitle" = COALESCE("missionTitle", 'رسالتنا'),
  "missionParagraph1" = COALESCE("missionParagraph1", 'تكمن رسالتنا في تمكين المستخدم من الوصول إلى "السيارة المثالية" من خلال توفير أدوات بحث ذكية، تقارير شفافة، وفريق دعم محترف يرافق العميل في كافة اشتراطات الفحص والتمويل.'),
  "missionParagraph2" = COALESCE("missionParagraph2", 'الالتزام بالجودة والدقة هو جوهر خدماتنا، لأن ثقة العملاء هي رأس مالنا الحقيقي.'),
  "missionImage" = COALESCE("missionImage", '/about-saudi-mission.jpg'),
  "missionImageAlt" = COALESCE("missionImageAlt", 'الحِجر (مدائن صالح) في العلا - السعودية'),
  "whyUsTitle" = COALESCE("whyUsTitle", 'لماذا يختار العملاء ماكس موتورز؟'),
  "ctaTitle" = COALESCE("ctaTitle", 'هل أنت مستعد للعثور على سيارتك؟'),
  "ctaText" = COALESCE("ctaText", 'انضم إلى آلاف المستخدمين الذين يثقون في ماكس موتورز للوصول إلى أفضل العروض المتاحة.');

ALTER TABLE "AboutPage" ALTER COLUMN "introText" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "visionTitle" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "visionParagraph1" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "visionParagraph2" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "missionTitle" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "missionParagraph1" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "missionParagraph2" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "whyUsTitle" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "ctaTitle" SET NOT NULL;
ALTER TABLE "AboutPage" ALTER COLUMN "ctaText" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AboutFeature_aboutPageId_idx" ON "AboutFeature"("aboutPageId");
CREATE INDEX "AboutFeature_order_idx" ON "AboutFeature"("order");
CREATE INDEX "AboutFeature_isActive_idx" ON "AboutFeature"("isActive");

-- AddForeignKey
ALTER TABLE "AboutFeature" ADD CONSTRAINT "AboutFeature_aboutPageId_fkey" FOREIGN KEY ("aboutPageId") REFERENCES "AboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
