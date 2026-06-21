import { PrismaClient } from "../src/generated/prisma/index.js";
import {
  auditAllBrandSegmentCoverage,
  resolveInsuranceSegmentForCar,
} from "../src/lib/brand-segment.js";
import { DEFAULT_BRAND_SEGMENT_MAP } from "../src/lib/loan-calculator.js";

const dryRun = process.argv.includes("--dry-run");
const batchSize = 25;
const db = new PrismaClient();

try {
  const cars = await db.car.findMany({
    select: { id: true, make: true, insuranceSegment: true },
    orderBy: { createdAt: "desc" },
  });
  const banks = await db.bank.findMany({
    select: { id: true, name: true, brandSegmentMap: true },
  });

  const preAudit = auditAllBrandSegmentCoverage(cars, banks, DEFAULT_BRAND_SEGMENT_MAP);
  console.log(`Pre-backfill: ${preAudit.default.unmatched.length} unmatched, ${cars.filter((c) => !c.insuranceSegment).length} missing segment`);

  const pending = cars.filter((car) => !car.insuranceSegment);
  let updated = 0;
  let failed = 0;
  const failures = [];

  for (const car of pending) {
    try {
      car._resolvedSegment = resolveInsuranceSegmentForCar(car.make, DEFAULT_BRAND_SEGMENT_MAP);
    } catch (error) {
      failed += 1;
      failures.push({ id: car.id, make: car.make, error: error.message });
    }
  }

  const toWrite = pending.filter((car) => car._resolvedSegment);

  if (dryRun) {
    for (const car of toWrite.slice(0, 10)) {
      console.log(`DRY RUN ${car.id} (${car.make}) → ${car._resolvedSegment}`);
    }
    if (toWrite.length > 10) console.log(`... ${toWrite.length - 10} more`);
  } else {
    for (let i = 0; i < toWrite.length; i += batchSize) {
      const batch = toWrite.slice(i, i + batchSize);
      await Promise.all(
        batch.map((car) =>
          db.car.update({
            where: { id: car.id },
            data: { insuranceSegment: car._resolvedSegment },
          })
        )
      );
      updated += batch.length;
      if (updated % 50 === 0 || updated === toWrite.length) {
        console.log(`Updated ${updated}/${toWrite.length}`);
      }
    }
  }

  console.log(
    `\n${dryRun ? "Dry run" : "Backfill"} complete: updated=${dryRun ? toWrite.length : updated}, skipped=${cars.length - pending.length}, failed=${failed}`
  );
  for (const row of failures.slice(0, 10)) {
    console.log("FAIL", JSON.stringify(row));
  }

  if (!dryRun && updated > 0) {
    const refreshed = await db.car.findMany({ select: { id: true, make: true, insuranceSegment: true } });
    const postAudit = auditAllBrandSegmentCoverage(refreshed, banks, DEFAULT_BRAND_SEGMENT_MAP);
    const stillMissing = refreshed.filter((c) => !c.insuranceSegment).length;
    console.log(`Post-backfill: ${postAudit.default.unmatched.length} unmatched, ${stillMissing} still missing segment`);
    process.exit(postAudit.hasUnmatched || stillMissing > 0 || failed > 0 ? 1 : 0);
  }

  process.exit(failed > 0 ? 1 : 0);
} catch (error) {
  console.error("Backfill failed:", error.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
