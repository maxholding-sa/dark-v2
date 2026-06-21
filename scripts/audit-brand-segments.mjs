import { PrismaClient } from "../src/generated/prisma/index.js";
import {
  auditAllBrandSegmentCoverage,
  normalizeBrandKey,
  resolveInsuranceSegmentForCar,
} from "../src/lib/brand-segment.js";
import { DEFAULT_BRAND_SEGMENT_MAP } from "../src/lib/loan-calculator.js";

const db = new PrismaClient();

try {
  const cars = await db.car.findMany({
    select: { id: true, make: true, model: true, insuranceSegment: true },
    orderBy: { createdAt: "desc" },
  });
  const banks = await db.bank.findMany({
    select: { id: true, name: true, brandSegmentMap: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`=== Brand segment audit (${cars.length} cars, ${banks.length} banks) ===\n`);

  const report = auditAllBrandSegmentCoverage(cars, banks, DEFAULT_BRAND_SEGMENT_MAP);

  console.log(`Default table: ${report.default.brandsInMap} brands, ${report.default.unmatched.length} unmatched cars`);
  if (report.default.unmatchedMakeSummary?.length) {
    console.log("  Unmatched makes (default):", report.default.unmatchedMakeSummary);
  }
  for (const row of report.default.unmatched.slice(0, 10)) {
    console.log("  UNMATCHED", JSON.stringify(row));
  }
  if (report.default.unmatched.length > 10) {
    console.log(`  ... and ${report.default.unmatched.length - 10} more cars`);
  }

  for (const bankAudit of report.banks) {
    console.log(
      `\n${bankAudit.mapLabel}: ${bankAudit.brandsInMap} brands, ${bankAudit.unmatched.length} unmatched cars`
    );
    for (const row of bankAudit.unmatched.slice(0, 20)) {
      console.log("  UNMATCHED", JSON.stringify(row));
    }
    if (bankAudit.unmatched.length > 20) {
      console.log(`  ... and ${bankAudit.unmatched.length - 20} more`);
    }
  }

  const missingSegment = cars.filter((car) => !car.insuranceSegment);
  console.log(`\nCars missing stored insuranceSegment: ${missingSegment.length}`);
  for (const car of missingSegment) {
    const normalized = normalizeBrandKey(car.make);
    let wouldResolve = null;
    try {
      wouldResolve = resolveInsuranceSegmentForCar(car.make, DEFAULT_BRAND_SEGMENT_MAP);
    } catch {
      wouldResolve = null;
    }
    console.log(
      "  MISSING",
      JSON.stringify({
        carId: car.id,
        make: car.make,
        normalizedMake: normalized,
        wouldResolveTo: wouldResolve,
      })
    );
  }

  console.log(report.hasUnmatched || missingSegment.length > 0 ? "\nOverall: FAIL" : "\nOverall: PASS");
  process.exit(report.hasUnmatched || missingSegment.length > 0 ? 1 : 0);
} catch (error) {
  console.error("Audit failed:", error.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
