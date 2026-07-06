-- =============================================================================
-- MAX MOTORS — New migrations only (run on existing database)
-- Supabase Dashboard → SQL Editor → paste → Run
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================================================

-- ---------- Prerequisites: Car, Bank, LoanRequest (if never created) ----------
DO $$ BEGIN
  CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'SOLD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Car" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "mileage" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "bodyType" TEXT NOT NULL,
    "isLuxury" BOOLEAN NOT NULL DEFAULT false,
    "insuranceSegment" TEXT,
    "driveType" TEXT,
    "seats" INTEGER,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "videoUrl" TEXT,
    "status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "testDriveAvailable" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Car_make_model_idx" ON "Car"("make", "model");
CREATE INDEX IF NOT EXISTS "Car_bodyType_idx" ON "Car"("bodyType");
CREATE INDEX IF NOT EXISTS "Car_price_idx" ON "Car"("price");
CREATE INDEX IF NOT EXISTS "Car_year_idx" ON "Car"("year");
CREATE INDEX IF NOT EXISTS "Car_status_idx" ON "Car"("status");
CREATE INDEX IF NOT EXISTS "Car_fuelType_idx" ON "Car"("fuelType");
CREATE INDEX IF NOT EXISTS "Car_featured_idx" ON "Car"("featured");

CREATE TABLE IF NOT EXISTS "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoImage" TEXT NOT NULL DEFAULT '',
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 4.5,
    "sectorInterestRates" JSONB,
    "defaultBalloonPaymentPct" DECIMAL(5,2),
    "loanPolicy" TEXT,
    "adminFeesCap" DECIMAL(10,2),
    "defaultAdminFeesPct" DECIMAL(5,4),
    "minInsurancePremium" DECIMAL(10,2),
    "assetDepreciationRate" DECIMAL(5,4),
    "ftpAnchors" JSONB,
    "cor" DECIMAL(6,4),
    "opex" DECIMAL(6,4),
    "irrTarget" DECIMAL(6,4),
    "brandSegmentMap" JSONB,
    "insuranceTable" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoanRequest" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "idImage" TEXT,
    "carMake" TEXT NOT NULL,
    "carModel" TEXT NOT NULL,
    "carCategory" TEXT,
    "carYear" INTEGER NOT NULL,
    "birthDateType" TEXT NOT NULL DEFAULT 'hijri',
    "birthMonth" TEXT NOT NULL,
    "birthYear" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "loanAmount" DECIMAL(12,2) NOT NULL,
    "downPayment" DECIMAL(12,2) NOT NULL,
    "loanTerm" INTEGER NOT NULL,
    "termMonths" INTEGER,
    "downPaymentPct" DECIMAL(5,2),
    "monthlyPayment" DECIMAL(12,2),
    "baseInstallment" DECIMAL(12,2),
    "monthlyInsurance" DECIMAL(12,2),
    "interestRate" DECIMAL(5,2),
    "finalPayment" DECIMAL(12,2),
    "balloonPayment" DECIMAL(12,2),
    "balloonPaymentPct" DECIMAL(5,2),
    "adminFees" DECIMAL(12,2),
    "totalInsurance" DECIMAL(12,2),
    "totalProfit" DECIMAL(12,2),
    "totalPayment" DECIMAL(12,2),
    "insuranceSegment" TEXT,
    "offerSnapshot" JSONB,
    "netSalary" DECIMAL(12,2),
    "employerSector" TEXT,
    "employer" TEXT,
    "salaryTransferBankId" TEXT,
    "hasRealEstateFinance" BOOLEAN,
    "hasCreditDefault" BOOLEAN,
    "totalMonthlyObligations" DECIMAL(12,2),
    "additionalInfo" TEXT,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanRequest_carId_idx" ON "LoanRequest"("carId");
CREATE INDEX IF NOT EXISTS "LoanRequest_email_idx" ON "LoanRequest"("email");
CREATE INDEX IF NOT EXISTS "LoanRequest_mobileNumber_idx" ON "LoanRequest"("mobileNumber");
CREATE INDEX IF NOT EXISTS "LoanRequest_status_idx" ON "LoanRequest"("status");
CREATE INDEX IF NOT EXISTS "LoanRequest_createdAt_idx" ON "LoanRequest"("createdAt");

DO $$ BEGIN
  IF to_regclass('public."Car"') IS NOT NULL THEN
    ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_carId_fkey"
      FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF to_regclass('public."Bank"') IS NOT NULL THEN
    ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_salaryTransferBankId_fkey"
      FOREIGN KEY ("salaryTransferBankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- 20260618120000_restructure_about_page ----------
CREATE TABLE IF NOT EXISTS "AboutPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'من نحن',
    "introText" TEXT,
    "visionTitle" TEXT DEFAULT 'رؤيتنا',
    "visionParagraph1" TEXT,
    "visionParagraph2" TEXT,
    "visionImage" TEXT,
    "visionImageAlt" TEXT,
    "missionTitle" TEXT DEFAULT 'رسالتنا',
    "missionParagraph1" TEXT,
    "missionParagraph2" TEXT,
    "missionImage" TEXT,
    "missionImageAlt" TEXT,
    "whyUsTitle" TEXT DEFAULT 'لماذا يختار العملاء ماكس موتورز؟',
    "ctaTitle" TEXT DEFAULT 'هل أنت مستعد للعثور على سيارتك؟',
    "ctaText" TEXT,
    "content" TEXT,
    "heroImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AboutPage_id_key" ON "AboutPage"("id");
CREATE TABLE IF NOT EXISTS "AboutFeature" (
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

UPDATE "AboutPage"
SET "introText" = COALESCE("introText", "content")
WHERE "introText" IS NULL AND "content" IS NOT NULL;

ALTER TABLE "AboutPage" DROP COLUMN IF EXISTS "content";
ALTER TABLE "AboutPage" DROP COLUMN IF EXISTS "heroImage";

ALTER TABLE "AboutPage" ALTER COLUMN "title" SET DEFAULT 'من نحن';

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
  "ctaText" = COALESCE("ctaText", 'انضم إلى آلاف المستخدمين الذين يثقون في ماكس موتورز للوصول إلى أفضل العروض المتاحة.')
WHERE "introText" IS NULL
   OR "visionParagraph1" IS NULL
   OR "missionParagraph1" IS NULL
   OR "ctaText" IS NULL;

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

CREATE INDEX IF NOT EXISTS "AboutFeature_aboutPageId_idx" ON "AboutFeature"("aboutPageId");
CREATE INDEX IF NOT EXISTS "AboutFeature_order_idx" ON "AboutFeature"("order");
CREATE INDEX IF NOT EXISTS "AboutFeature_isActive_idx" ON "AboutFeature"("isActive");

DO $$ BEGIN
  ALTER TABLE "AboutFeature" ADD CONSTRAINT "AboutFeature_aboutPageId_fkey"
    FOREIGN KEY ("aboutPageId") REFERENCES "AboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- 20260620120000_bank_finance_loan_offer_fields ----------
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "adminFeesCap" DECIMAL(10,2);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "defaultAdminFeesPct" DECIMAL(5,4);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "minInsurancePremium" DECIMAL(10,2);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "assetDepreciationRate" DECIMAL(5,4);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "ftpAnchors" JSONB;
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "cor" DECIMAL(6,4);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "opex" DECIMAL(6,4);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "irrTarget" DECIMAL(6,4);
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "brandSegmentMap" JSONB;
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "insuranceTable" JSONB;

ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "insuranceSegment" TEXT;

ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "termMonths" INTEGER;
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "downPaymentPct" DECIMAL(5,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "baseInstallment" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "monthlyInsurance" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "balloonPayment" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "balloonPaymentPct" DECIMAL(5,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "adminFees" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "totalInsurance" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "totalProfit" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "totalPayment" DECIMAL(12,2);
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "insuranceSegment" TEXT;
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "offerSnapshot" JSONB;

-- ---------- 20260623120000_bank_sector_rates_balloon ----------
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "sectorInterestRates" JSONB;
ALTER TABLE "Bank" ADD COLUMN IF NOT EXISTS "defaultBalloonPaymentPct" DECIMAL(5,2);

UPDATE "Bank"
SET "sectorInterestRates" = jsonb_build_object(
  'خاص', "interestRate"::text::numeric,
  'حكومي مدني', "interestRate"::text::numeric,
  'حكومي عسكرى', "interestRate"::text::numeric,
  'متقاعد', "interestRate"::text::numeric
)
WHERE "sectorInterestRates" IS NULL;

-- ---------- 20260623182200_store_info_whatsapp_button_settings ----------
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappLabel" TEXT;
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappText" TEXT;

-- ---------- 20260624000000_loan_request_birth_date_type ----------
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "birthDateType" TEXT NOT NULL DEFAULT 'hijri';

-- ---------- schema extras (not in migration files) ----------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'EDITOR'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'EDITOR';
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "isLuxury" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Car" ADD COLUMN IF NOT EXISTS "driveType" TEXT;

CREATE TABLE IF NOT EXISTS "PixelSettings" (
    "id" TEXT NOT NULL,
    "facebookPixel" TEXT,
    "googleAnalytics" TEXT,
    "googleAdsId" TEXT,
    "tiktokPixel" TEXT,
    "snapchatPixel" TEXT,
    "microsoftClarity" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PixelSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PixelSettings_id_key" ON "PixelSettings"("id");

CREATE TABLE IF NOT EXISTS "Mandeb" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mandeb_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Mandeb_name_idx" ON "Mandeb"("name");
CREATE INDEX IF NOT EXISTS "Mandeb_city_idx" ON "Mandeb"("city");
