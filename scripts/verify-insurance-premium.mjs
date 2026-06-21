import { PrismaClient } from "../src/generated/prisma/index.js";
import {
  INSURANCE_REGRESSION_FIXTURE_BANKS,
  runInsurancePremiumRegression,
} from "../src/lib/loan-calculator.js";

let failed = false;

console.log("=== Insurance premium regression (fixture banks) ===");
const fixtureResult = runInsurancePremiumRegression(INSURANCE_REGRESSION_FIXTURE_BANKS);
const fixtureScenarios =
  INSURANCE_REGRESSION_FIXTURE_BANKS.length * 4 * 3 * 5;
console.log(
  `${fixtureResult.pass ? "PASS" : "FAIL"} ${fixtureScenarios} scenarios across ${INSURANCE_REGRESSION_FIXTURE_BANKS.length} fixture banks`
);
if (!fixtureResult.pass) {
  failed = true;
  for (const failure of fixtureResult.failures) {
    console.log("  FAIL", JSON.stringify(failure));
  }
}

console.log("\n=== Insurance premium regression (database banks) ===");
try {
  const db = new PrismaClient();
  const dbBanks = await db.bank.findMany({ orderBy: { createdAt: "desc" } });
  await db.$disconnect();

  const normalized = dbBanks.map((bank) => ({
    ...bank,
    minInsurancePremium:
      bank.minInsurancePremium != null ? parseFloat(bank.minInsurancePremium.toString()) : null,
    assetDepreciationRate:
      bank.assetDepreciationRate != null ? parseFloat(bank.assetDepreciationRate.toString()) : null,
  }));

  if (normalized.length === 0) {
    console.log("SKIP no banks in database — fixture banks must pass");
  } else {
    const dbResult = runInsurancePremiumRegression(normalized);
    const dbScenarios = normalized.length * 4 * 3 * 5;
    console.log(
      `${dbResult.pass ? "PASS" : "FAIL"} ${dbScenarios} scenarios across ${normalized.length} database banks`
    );
    if (!dbResult.pass) {
      failed = true;
      for (const failure of dbResult.failures) {
        console.log("  FAIL", JSON.stringify(failure));
      }
    }
  }
} catch (error) {
  console.log(`SKIP database regression (${error.message}) — fixture banks must pass`);
}

console.log(failed ? "\nOverall: FAIL" : "\nOverall: PASS");
process.exit(failed ? 1 : 0);
