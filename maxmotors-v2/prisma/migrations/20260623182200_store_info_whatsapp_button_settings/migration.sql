-- AlterTable: add WhatsApp floating button settings to StoreInfo
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappLabel" TEXT;
ALTER TABLE "StoreInfo" ADD COLUMN IF NOT EXISTS "whatsappText" TEXT;
