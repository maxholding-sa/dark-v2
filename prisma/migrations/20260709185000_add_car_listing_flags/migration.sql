ALTER TABLE "Car" ADD COLUMN "isEconomic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Car" ADD COLUMN "isCommercial" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Car"
SET "isEconomic" = true
WHERE "bodyType" IN ('إقتصادية', 'اقتصادية');

UPDATE "Car"
SET "isCommercial" = true
WHERE "bodyType" = 'مركبة تجارية';

CREATE INDEX "Car_isEconomic_idx" ON "Car"("isEconomic");
CREATE INDEX "Car_isCommercial_idx" ON "Car"("isCommercial");
