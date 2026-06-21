export const VALID_INSURANCE_SEGMENTS = ["A", "B", "C", "D", "E", "F", "G"];

/** Normalize brand for lookup: trim, collapse whitespace, lowercase. */
export function normalizeBrandKey(brand) {
  if (brand == null) return "";
  return String(brand).trim().replace(/\s+/g, " ").toLowerCase();
}

export class BrandSegmentNotFoundError extends Error {
  constructor(brand, mapLabel = "brand segment map") {
    const display = brand == null || brand === "" ? "(empty)" : String(brand).trim();
    super(
      `Brand "${display}" has no insurance category in ${mapLabel}. Add it to the category table or correct the make before saving.`
    );
    this.name = "BrandSegmentNotFoundError";
    this.brand = display;
    this.mapLabel = mapLabel;
  }
}

export class InsuranceSegmentError extends Error {
  constructor(message, code = "INSURANCE_SEGMENT_REQUIRED") {
    super(message);
    this.name = "InsuranceSegmentError";
    this.code = code;
  }
}

/** Arabic / transliteration aliases → canonical English map key (normalized on lookup). */
export const BRAND_NAME_ALIASES = {
  toyota: "toyota",
  "تويوتا": "toyota",
  lexus: "lexus",
  "لكزس": "lexus",
  hyundai: "hyundai",
  "هيونداي": "hyundai",
  kia: "kia",
  "كيا": "kia",
  nissan: "nissan",
  "نيسان": "nissan",
  jeep: "jeep",
  "جيب": "jeep",
  bmw: "bmw",
  "بي ام دبليو": "bmw",
  mercedes: "mercedes",
  "mercedes-benz": "mercedes",
  "مرسيدس": "mercedes",
  chevrolet: "chevrolet",
  "شيفروليه": "chevrolet",
  ford: "ford",
  "فورد": "ford",
  honda: "honda",
  "هوندا": "honda",
  suzuki: "suzuki",
  "سوزوكي": "suzuki",
  mitsubishi: "mitsubishi",
  "ميتسوبيشي": "mitsubishi",
  genesis: "genesis",
  "جينسيس": "genesis",
  mg: "mg",
  geely: "geely",
  "جيلي": "geely",
  changan: "changan",
  "شانجان": "changan",
  jetour: "jetour",
  "جيتور": "jetour",
  chery: "chery",
  "شيري": "chery",
  byd: "byd",
  "بي واي دي": "byd",
  skoda: "skoda",
  "سكودا": "skoda",
  renault: "renault",
  "رينو": "renault",
  peugeot: "peugeot",
  "بيجو": "peugeot",
  gac: "gac",
  "جي ايه سي": "gac",
  baic: "baic",
  "بايك": "baic",
  foton: "foton",
  "فوتون": "foton",
  jac: "jac",
  haval: "haval",
  "هافال": "haval",
  dongfeng: "dongfeng",
  "دونج فينج": "dongfeng",
  soueast: "soueast",
  "ساو إيست": "soueast",
  hongqi: "hongqi",
  "هونشي": "hongqi",
  faw: "faw",
  "فاو بيستون": "faw",
  kaiyi: "kaiyi",
  "كايي": "kaiyi",
  isuzu: "isuzu",
  "ايسوزو": "isuzu",
  "land rover": "land rover",
  "لاندروفر": "land rover",
  "range rover": "range rover",
  "رانج روفر": "range rover",
  ferrari: "ferrari",
  "فيراري": "ferrari",
  lamborghini: "lamborghini",
  "لامبورغيني": "lamborghini",
  "rolls-royce": "rolls-royce",
  "rolls royce": "rolls-royce",
  "رولز رويس": "rolls-royce",
  porsche: "porsche",
  "بورش": "porsche",
  volkswagen: "volkswagen",
  "فولكس فاجن": "volkswagen",
  gmc: "gmc",
  "جي أم سي": "gmc",
  fiat: "fiat",
  "فيات": "fiat",
  rox: "rox",
};

/** Build normalized-key → segment lookup from raw map keys and optional aliases. */
export function buildNormalizedBrandSegmentLookup(rawMap, aliases = BRAND_NAME_ALIASES) {
  const lookup = new Map();
  if (!rawMap || typeof rawMap !== "object") return lookup;

  for (const [rawKey, segment] of Object.entries(rawMap)) {
    const key = normalizeBrandKey(rawKey);
    if (!key) continue;
    lookup.set(key, String(segment).trim().toUpperCase());
  }

  if (aliases && typeof aliases === "object") {
    for (const [aliasRaw, canonicalRaw] of Object.entries(aliases)) {
      const aliasKey = normalizeBrandKey(aliasRaw);
      const canonicalKey = normalizeBrandKey(canonicalRaw);
      const segment = lookup.get(canonicalKey);
      if (segment && aliasKey) lookup.set(aliasKey, segment);
    }
  }

  return lookup;
}

export function parseBrandSegmentMap(value, fallback = null) {
  if (value == null || value === "") {
    if (fallback == null) return {};
    return { ...fallback };
  }
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback ? { ...fallback } : {};
  } catch {
    return fallback ? { ...fallback } : {};
  }
}

/** Resolve segment from map; throws BrandSegmentNotFoundError when missing. */
export function resolveInsuranceSegmentFromMap(rawMap, brand, { mapLabel = "brand segment map" } = {}) {
  const key = normalizeBrandKey(brand);
  if (!key) {
    throw new BrandSegmentNotFoundError(brand, mapLabel);
  }

  const lookup = buildNormalizedBrandSegmentLookup(rawMap);
  const segment = lookup.get(key);
  if (!segment) {
    throw new BrandSegmentNotFoundError(brand, mapLabel);
  }

  return validateInsuranceSegment(segment);
}

/** Resolve at car create/update — caller supplies the canonical map. */
export function resolveInsuranceSegmentForCar(make, rawMap) {
  if (!rawMap || typeof rawMap !== "object") {
    throw new Error("Brand segment map is required to resolve insurance category.");
  }
  return resolveInsuranceSegmentFromMap(rawMap, make, { mapLabel: "default brand category table" });
}

export function isBrandInSegmentMap(rawMap, brand) {
  const key = normalizeBrandKey(brand);
  if (!key) return false;
  return buildNormalizedBrandSegmentLookup(rawMap).has(key);
}

export function brandSegmentRowsToMap(rows) {
  const map = {};
  for (const row of rows || []) {
    const make = String(row?.make ?? "").trim();
    const segment = String(row?.segment ?? "").trim().toUpperCase();
    if (!make || !segment) continue;
    map[make] = validateInsuranceSegment(segment);
  }
  return map;
}

export function brandSegmentMapToJson(map) {
  if (!map || typeof map !== "object") return "{}";
  return JSON.stringify(map, null, 2);
}

function findSegmentInMapByBrand(rawMap, brand) {
  const key = normalizeBrandKey(brand);
  if (!key) return null;
  return buildNormalizedBrandSegmentLookup(rawMap).get(key) || null;
}

/**
 * Build editable rows for each inventory make, merging saved overrides and default map suggestions.
 */
export function buildBrandSegmentRowsForMakes(makes, defaultMap, savedMap = null) {
  const saved = parseBrandSegmentMap(savedMap, {});
  const uniqueMakes = [...new Set((makes || []).map((m) => String(m).trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ar")
  );

  return uniqueMakes.map((make) => {
    const savedSegment = findSegmentInMapByBrand(saved, make);
    if (savedSegment) {
      return { make, segment: savedSegment, source: "saved" };
    }

    if (defaultMap && isBrandInSegmentMap(defaultMap, make)) {
      try {
        const segment = resolveInsuranceSegmentFromMap(defaultMap, make, {
          mapLabel: "default brand category table",
        });
        return { make, segment, source: "default" };
      } catch {
        return { make, segment: "", source: "unassigned" };
      }
    }

    return { make, segment: "", source: "unassigned" };
  });
}

/** Merge inventory-derived segments from cars (most common insuranceSegment per make). */
export function mergeInventorySegmentHints(rows, hintsByMake = {}) {
  if (!hintsByMake || typeof hintsByMake !== "object") return rows;

  return rows.map((row) => {
    if (row.segment) return row;
    const hint =
      hintsByMake[row.make] ??
      hintsByMake[normalizeBrandKey(row.make)] ??
      null;
    if (!hint) return row;
    try {
      return {
        ...row,
        segment: validateInsuranceSegment(hint),
        source: row.source === "saved" ? "saved" : "inventory",
      };
    } catch {
      return row;
    }
  });
}

export function aggregateInventorySegmentsByMake(cars) {
  const countsByMake = new Map();

  for (const car of cars || []) {
    const make = String(car?.make ?? "").trim();
    const segment = String(car?.insuranceSegment ?? "").trim().toUpperCase();
    if (!make || !segment) continue;

    const key = normalizeBrandKey(make);
    if (!countsByMake.has(key)) {
      countsByMake.set(key, { displayMake: make, segments: {} });
    }
    const entry = countsByMake.get(key);
    entry.segments[segment] = (entry.segments[segment] || 0) + 1;
  }

  const hints = {};
  for (const [, { displayMake, segments }] of countsByMake) {
    const top = Object.entries(segments).sort((a, b) => b[1] - a[1])[0];
    if (top) hints[displayMake] = top[0];
  }
  return hints;
}

/** Validate stored segment letter (A–G). */
export function validateInsuranceSegment(segment) {
  const normalized = String(segment ?? "")
    .trim()
    .toUpperCase();
  if (!VALID_INSURANCE_SEGMENTS.includes(normalized)) {
    throw new InsuranceSegmentError(
      `Invalid insurance segment "${segment}". Expected one of ${VALID_INSURANCE_SEGMENTS.join(", ")}.`,
      "INSURANCE_SEGMENT_INVALID"
    );
  }
  return normalized;
}

/** Require pre-resolved segment at quote time — no brand string fallback. */
export function requireInsuranceSegment(segment) {
  if (segment == null || String(segment).trim() === "") {
    throw new InsuranceSegmentError(
      "Insurance category is not set on this vehicle. Resolve the make in the category table before generating quotes.",
      "INSURANCE_SEGMENT_MISSING"
    );
  }
  return validateInsuranceSegment(segment);
}

/**
 * Find cars whose make does not match a brand segment map (normalized).
 * Returns { unmatched: [{ carId, make, normalizedMake }], brandsInMap, carsChecked }.
 */
export function auditCarsAgainstBrandSegmentMap(cars, rawMap, { mapLabel = "brand segment map" } = {}) {
  const lookup = buildNormalizedBrandSegmentLookup(rawMap);
  const unmatched = [];

  for (const car of cars || []) {
    const normalizedMake = normalizeBrandKey(car.make);
    if (!normalizedMake) {
      unmatched.push({
        carId: car.id,
        make: car.make,
        normalizedMake,
        mapLabel,
        reason: "empty make",
      });
      continue;
    }
    if (!lookup.has(normalizedMake)) {
      unmatched.push({
        carId: car.id,
        make: car.make,
        normalizedMake,
        mapLabel,
        reason: "brand not in category table",
      });
    }
  }

  const unmatchedByMake = new Map();
  for (const row of unmatched) {
    const key = row.normalizedMake || row.make || "";
    unmatchedByMake.set(key, (unmatchedByMake.get(key) || 0) + 1);
  }

  return {
    mapLabel,
    brandsInMap: lookup.size,
    carsChecked: (cars || []).length,
    unmatched,
    unmatchedMakeSummary: [...unmatchedByMake.entries()]
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Audit all cars against default map and each bank's custom map. */
export function auditAllBrandSegmentCoverage(cars, banks = [], defaultMap) {
  if (!defaultMap || typeof defaultMap !== "object") {
    throw new Error("defaultMap is required for auditAllBrandSegmentCoverage");
  }

  const defaultAudit = auditCarsAgainstBrandSegmentMap(cars, defaultMap, {
    mapLabel: "default brand category table",
  });

  const bankAudits = (banks || []).map((bank) => {
    const rawMap = parseBrandSegmentMap(bank.brandSegmentMap, defaultMap);
    const mapLabel = `bank "${bank.name}" (${bank.id})`;
    return auditCarsAgainstBrandSegmentMap(cars, rawMap, { mapLabel });
  });

  return {
    default: defaultAudit,
    banks: bankAudits,
    hasUnmatched:
      defaultAudit.unmatched.length > 0 || bankAudits.some((a) => a.unmatched.length > 0),
  };
}

/** Fixture banks for offline segment matrix tests. */
export const BRAND_SEGMENT_REGRESSION_FIXTURE_BANKS = [
  { id: "segment-regression-default", name: "Segment default map", brandSegmentMap: null },
  {
    id: "segment-regression-subset",
    name: "Segment subset map",
    brandSegmentMap: { Toyota: "A", BMW: "D", Mercedes: "D" },
  },
];

/**
 * Per-bank brand resolution: valid brands resolve (when in map), invalid always throw — never default.
 */
export function runBrandSegmentMatrixRegression(
  banks,
  defaultMap,
  {
    validBrands = ["  Toyota  ", "  Mercedes  ", "مرسيدس ", "  BMW  "],
    invalidBrands = ["Totota", "ZzzMissingBrandXYZ", "  FakeBrandCo  "],
    maxFailures = 40,
  } = {}
) {
  if (!defaultMap || typeof defaultMap !== "object") {
    throw new Error("defaultMap is required for runBrandSegmentMatrixRegression");
  }

  const failures = [];
  const bankList = Array.isArray(banks) ? banks : [];

  for (const bank of bankList) {
    const rawMap = parseBrandSegmentMap(bank.brandSegmentMap, defaultMap);
    const mapLabel = `bank "${bank.name}" (${bank.id})`;

    for (const brand of validBrands) {
      if (!isBrandInSegmentMap(rawMap, brand)) continue;

      try {
        resolveInsuranceSegmentFromMap(rawMap, brand, { mapLabel });
      } catch (error) {
        failures.push({
          bankId: bank.id,
          bankName: bank.name,
          brand,
          reason: "normalized valid brand should resolve",
          error: error.message,
        });
      }
    }

    for (const brand of invalidBrands) {
      let threw = false;
      try {
        resolveInsuranceSegmentFromMap(rawMap, brand, { mapLabel });
      } catch (error) {
        threw = true;
        if (!(error instanceof BrandSegmentNotFoundError)) {
          failures.push({
            bankId: bank.id,
            bankName: bank.name,
            brand,
            reason: "invalid brand should throw BrandSegmentNotFoundError",
            error: error.message,
          });
        }
      }

      if (!threw) {
        failures.push({
          bankId: bank.id,
          bankName: bank.name,
          brand,
          reason: "invalid brand resolved silently instead of throwing",
        });
      }

      if (isBrandInSegmentMap(rawMap, brand)) {
        failures.push({
          bankId: bank.id,
          bankName: bank.name,
          brand,
          reason: "invalid brand incorrectly present in normalized lookup",
        });
      }
    }

    if (failures.length >= maxFailures) {
      return { pass: false, failures, truncated: true };
    }
  }

  return { pass: failures.length === 0, failures, truncated: false };
}
