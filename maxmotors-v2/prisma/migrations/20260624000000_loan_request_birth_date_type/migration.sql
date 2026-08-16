-- AlterTable: add birthDateType to LoanRequest (default "hijri" for existing rows)
ALTER TABLE "LoanRequest" ADD COLUMN "birthDateType" TEXT NOT NULL DEFAULT 'hijri';
