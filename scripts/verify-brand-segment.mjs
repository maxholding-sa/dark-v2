import { PrismaClient } from "../src/generated/prisma/index.js";
import {
  BrandSegmentNotFoundError,
  BRAND_SEGMENT_REGRESSION_FIXTURE_BANKS,
  InsuranceSegmentError,
  normalizeBrandKey,
  requireInsuranceSegment,
  resolveInsuranceSegmentFromMap,
  runBrandSegmentMatrixRegression,
} from "../src/lib/brand-segment.js";
import {
  buildCustomerFinancingOffer,
  createBankConfigFromBank,
  DEFAULT_BANK_CONFIG,
  DEFAULT_BRAND_SEGMENT_MAP,
} from "../src/lib/loan-calculator.js";

let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`PASS ${label}`);
    return;
  }
  console.log(`FAIL ${label}`);
  failed += 1;
}

function assertThrows(fn, ErrorClass, label) {
  try {
    fn();
    console.log(`FAIL ${label} (expected throw)`);
    failed += 1;
  } catch (error) {
    if (error instanceof ErrorClass) {
      console.log(`PASS ${label}`);
    } else {
      console.log(`FAIL ${label} (wrong error: ${error.message})`);
      failed += 1;
    }
  }
}

console.log("=== Brand normalization ===");
assert(normalizeBrandKey("  Mercedes  ") === "mercedes", "trim + collapse spaces + lowercase");
assert(normalizeBrandKey("  مرسيدس ") === "مرسيدس", "Arabic trim");

console.log("\n=== Resolve from map (no silent default) ===");
assert(
  resolveInsuranceSegmentFromMap(DEFAULT_BRAND_SEGMENT_MAP, "  Mercedes  ") === "D",
  "Mercedes with extra spaces → D"
);
assert(
  resolveInsuranceSegmentFromMap(DEFAULT_BRAND_SEGMENT_MAP, "مرسيدس ") === "D",
  "Arabic Mercedes with trailing space → D"
);
assertThrows(
  () => resolveInsuranceSegmentFromMap(DEFAULT_BRAND_SEGMENT_MAP, "Totota"),
  BrandSegmentNotFoundError,
  "typo Totota throws BrandSegmentNotFoundError"
);
assertThrows(
  () => resolveInsuranceSegmentFromMap(DEFAULT_BRAND_SEGMENT_MAP, "ZzzUnknownBrand"),
  BrandSegmentNotFoundError,
  "unknown brand throws BrandSegmentNotFoundError"
);

console.log("\n=== Quote engine requires stored segment ===");
assertThrows(() => requireInsuranceSegment(null), InsuranceSegmentError, "missing insurance_segment throws");
assert(requireInsuranceSegment("d") === "D", "valid segment letter accepted");

const offerWithSegment = buildCustomerFinancingOffer(
  DEFAULT_BANK_CONFIG,
  {
    car_price: 278000,
    down_payment_pct: 0.2,
    term_months: 60,
    profit_rate: 0.05,
    admin_fees_pct: 0.01,
    balloon_payment_pct: 0,
    gender: "male",
    age_bracket: "31 to 35",
    insurance_segment: "D",
    rebate: 0,
  },
  { id: 1, bankName: "Test Bank" }
);
assert(offerWithSegment.pricingAvailable === true, "offer with segment is priced");
assert(offerWithSegment.aprAvailable === true, "offer with segment shows APR");
assert(offerWithSegment.apr != null && offerWithSegment.apr > 0, "APR is positive");

const offerMissingSegment = buildCustomerFinancingOffer(
  DEFAULT_BANK_CONFIG,
  {
    car_price: 278000,
    down_payment_pct: 0.2,
    term_months: 60,
    profit_rate: 0.05,
    admin_fees_pct: 0.01,
    balloon_payment_pct: 0,
    gender: "male",
    age_bracket: "31 to 35",
    insurance_segment: null,
    rebate: 0,
  },
  { id: 2, bankName: "Test Bank" }
);
assert(offerMissingSegment.needsManualReview === true, "missing segment flags manual review");
assert(offerMissingSegment.pricingAvailable === false, "missing segment blocks pricing");

console.log("\n=== Brand segment matrix (fixture banks) ===");
const fixtureMatrix = runBrandSegmentMatrixRegression(
  BRAND_SEGMENT_REGRESSION_FIXTURE_BANKS,
  DEFAULT_BRAND_SEGMENT_MAP
);
console.log(
  `${fixtureMatrix.pass ? "PASS" : "FAIL"} matrix across ${BRAND_SEGMENT_REGRESSION_FIXTURE_BANKS.length} fixture banks`
);
if (!fixtureMatrix.pass) {
  failed += 1;
  for (const failure of fixtureMatrix.failures) {
    console.log("  FAIL", JSON.stringify(failure));
  }
}

console.log("\n=== Brand segment matrix (database banks) ===");
try {
  const db = new PrismaClient();
  const dbBanks = await db.bank.findMany({ orderBy: { createdAt: "desc" } });
  await db.$disconnect();

  if (dbBanks.length === 0) {
    console.log("SKIP no banks in database");
  } else {
    const dbMatrix = runBrandSegmentMatrixRegression(dbBanks, DEFAULT_BRAND_SEGMENT_MAP);
    console.log(
      `${dbMatrix.pass ? "PASS" : "FAIL"} matrix across ${dbBanks.length} database banks`
    );
    if (!dbMatrix.pass) {
      failed += 1;
      for (const failure of dbMatrix.failures) {
        console.log("  FAIL", JSON.stringify(failure));
      }
    }

    console.log("\n=== Offer path per bank (invalid brand / missing segment) ===");
    for (const bank of dbBanks) {
      const bankConfig = createBankConfigFromBank(bank);
      const blockedOffer = buildCustomerFinancingOffer(
        bankConfig,
        {
          car_price: 278000,
          down_payment_pct: 0.2,
          term_months: 60,
          profit_rate: parseFloat(bank.interestRate?.toString?.() ?? "5"),
          admin_fees_pct: 0.01,
          balloon_payment_pct: 0,
          gender: "male",
          age_bracket: "31 to 35",
          insurance_segment: null,
          rebate: 0,
        },
        { id: 1, bankName: bank.name }
      );
      assert(
        blockedOffer.needsManualReview === true && blockedOffer.pricingAvailable === false,
        `${bank.name}: missing segment blocks offer`
      );
    }
  }
} catch (error) {
  console.log(`SKIP database matrix (${error.message})`);
}

console.log(failed === 0 ? "\nOverall: PASS" : `\nOverall: FAIL (${failed} assertion groups)`);
process.exit(failed === 0 ? 0 : 1);
