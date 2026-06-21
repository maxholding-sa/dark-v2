import { PrismaClient } from "../src/generated/prisma/index.js";
import {
  APR_REGRESSION_FIXTURE_BANKS,
  APR_VERIFICATION_CASES,
  computeAprIncludingFees,
  runAprRegressionForBanks,
  verifyAprReferenceCases,
} from "../src/lib/loan-calculator.js";

const tolerancePct = 0.02;
let failed = false;

console.log("=== APR reference cases ===");
for (const testCase of APR_VERIFICATION_CASES) {
  const apr = computeAprIncludingFees(testCase);
  const aprPct = apr != null ? apr * 100 : null;
  const delta = aprPct != null ? Math.abs(aprPct - testCase.expectedAprPct) : Infinity;
  const pass = delta <= tolerancePct;

  console.log(
    `${pass ? "PASS" : "FAIL"} term=${testCase.termMonths} financed=${testCase.financeAmount} fee=${testCase.adminFees} balloon=${testCase.balloonPayment} → APR=${aprPct?.toFixed(3) ?? "null"}% (expected ${testCase.expectedAprPct}%)`
  );

  if (!pass) failed = true;
}

console.log(`verifyAprReferenceCases(): ${verifyAprReferenceCases() ? "PASS" : "FAIL"}\n`);

console.log("=== APR regression (fixture banks) ===");
const fixtureResult = runAprRegressionForBanks(APR_REGRESSION_FIXTURE_BANKS);
const fixtureScenarios =
  APR_REGRESSION_FIXTURE_BANKS.length *
  5 *
  5 *
  3;
console.log(
  `${fixtureResult.pass ? "PASS" : "FAIL"} ${fixtureScenarios} scenarios across ${APR_REGRESSION_FIXTURE_BANKS.length} fixture banks`
);
if (!fixtureResult.pass) {
  failed = true;
  for (const failure of fixtureResult.failures) {
    console.log("  FAIL", JSON.stringify(failure));
  }
}

console.log("\n=== APR regression (database banks) ===");
let dbBanks = [];
try {
  const db = new PrismaClient();
  dbBanks = await db.bank.findMany({ orderBy: { createdAt: "desc" } });
  await db.$disconnect();

  const normalized = dbBanks.map((bank) => ({
    ...bank,
    interestRate: bank.interestRate ? parseFloat(bank.interestRate.toString()) : 0,
    adminFeesCap: bank.adminFeesCap != null ? parseFloat(bank.adminFeesCap.toString()) : null,
    defaultAdminFeesPct:
      bank.defaultAdminFeesPct != null ? parseFloat(bank.defaultAdminFeesPct.toString()) : null,
  }));

  if (normalized.length === 0) {
    console.log("SKIP no banks in database — using fixture banks only");
  } else {
    const dbResult = runAprRegressionForBanks(normalized);
    const dbScenarios = normalized.length * 5 * 5 * 3;
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
