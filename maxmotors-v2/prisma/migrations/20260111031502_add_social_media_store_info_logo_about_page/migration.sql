-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "contentSections" JSONB;

-- AlterTable
ALTER TABLE "Bank" ADD COLUMN     "loanPolicy" TEXT;

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "category" TEXT,
ADD COLUMN     "testDriveAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "car" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "imageUrl" TEXT,
    "reviewText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRequest" (
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
    "birthMonth" TEXT NOT NULL,
    "birthYear" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "loanAmount" DECIMAL(12,2) NOT NULL,
    "downPayment" DECIMAL(12,2) NOT NULL,
    "loanTerm" INTEGER NOT NULL,
    "monthlyPayment" DECIMAL(12,2),
    "interestRate" DECIMAL(5,2),
    "finalPayment" DECIMAL(12,2),
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

-- CreateTable
CREATE TABLE "SocialMedia" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreInfo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Click Car Motors',
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logo" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT 'Company Logo',
    "type" TEXT NOT NULL DEFAULT 'main',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'عن المتجر',
    "content" TEXT NOT NULL,
    "heroImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_createdAt_idx" ON "Contact"("createdAt");

-- CreateIndex
CREATE INDEX "LoanRequest_carId_idx" ON "LoanRequest"("carId");

-- CreateIndex
CREATE INDEX "LoanRequest_email_idx" ON "LoanRequest"("email");

-- CreateIndex
CREATE INDEX "LoanRequest_mobileNumber_idx" ON "LoanRequest"("mobileNumber");

-- CreateIndex
CREATE INDEX "LoanRequest_status_idx" ON "LoanRequest"("status");

-- CreateIndex
CREATE INDEX "LoanRequest_createdAt_idx" ON "LoanRequest"("createdAt");

-- CreateIndex
CREATE INDEX "SocialMedia_platform_idx" ON "SocialMedia"("platform");

-- CreateIndex
CREATE INDEX "SocialMedia_isActive_idx" ON "SocialMedia"("isActive");

-- CreateIndex
CREATE INDEX "SocialMedia_order_idx" ON "SocialMedia"("order");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMedia_platform_key" ON "SocialMedia"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInfo_id_key" ON "StoreInfo"("id");

-- CreateIndex
CREATE INDEX "Logo_type_idx" ON "Logo"("type");

-- CreateIndex
CREATE INDEX "Logo_isActive_idx" ON "Logo"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_id_key" ON "AboutPage"("id");

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_salaryTransferBankId_fkey" FOREIGN KEY ("salaryTransferBankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
