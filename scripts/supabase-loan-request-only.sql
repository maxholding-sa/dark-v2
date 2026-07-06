-- Loan submit fix: creates Car, Bank, LoanRequest if missing
-- Run in Supabase SQL Editor (paste entire file)

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
