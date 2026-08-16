-- AlterTable: sector-specific interest rates and default last payment (balloon) %
ALTER TABLE "Bank" ADD COLUMN "sectorInterestRates" JSONB;
ALTER TABLE "Bank" ADD COLUMN "defaultBalloonPaymentPct" DECIMAL(5,2);

-- Backfill sector rates from existing single interestRate
UPDATE "Bank"
SET "sectorInterestRates" = jsonb_build_object(
  'خاص', "interestRate"::text::numeric,
  'حكومي مدني', "interestRate"::text::numeric,
  'حكومي عسكرى', "interestRate"::text::numeric,
  'متقاعد', "interestRate"::text::numeric
)
WHERE "sectorInterestRates" IS NULL;
