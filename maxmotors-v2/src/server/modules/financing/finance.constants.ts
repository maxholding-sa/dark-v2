/**
 * Reference data for the financing engine.
 *
 * Copied verbatim from v1 `src/lib/loan-calculator.js` and
 * `src/lib/brand-segment.js` — extracted programmatically rather than retyped,
 * because a single wrong digit in an insurance rate is a wrong quote to a
 * customer. A bank row in the database overrides any of it.
 */

export const INSURANCE_SEGMENTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type InsuranceSegment = (typeof INSURANCE_SEGMENTS)[number];

export const AGE_BRACKETS = [
  '18 to 24',
  '25 to 30',
  '31 to 35',
  '36 to 40',
  '41 to 45',
  '46 to 50',
  '51 to 60',
  '61+',
] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export type Gender = 'male' | 'female';

/** Fallback bracket when the customer's age maps to nothing known. */
export const DEFAULT_AGE_BRACKET: AgeBracket = '31 to 35';

export type InsuranceTable = Record<string, Record<string, Record<string, number>>>;

/** Annual insurance rate by gender x age bracket x vehicle segment. */
export const DEFAULT_INSURANCE_TABLE: InsuranceTable = {
  male: {
    "18 to 24": {
      A: 0.0581,
      B: 0.0504,
      C: 0.0455,
      D: 0.043,
      E: 0.041,
      F: 0.04,
      G: 0.039
    },
    "25 to 30": {
      A: 0.034,
      B: 0.0325,
      C: 0.031,
      D: 0.03,
      E: 0.029,
      F: 0.0285,
      G: 0.028
    },
    "31 to 35": {
      A: 0.0252,
      B: 0.0245,
      C: 0.0266,
      D: 0.026,
      E: 0.0255,
      F: 0.025,
      G: 0.0245
    },
    "36 to 40": {
      A: 0.0235,
      B: 0.023,
      C: 0.024,
      D: 0.0238,
      E: 0.0235,
      F: 0.0232,
      G: 0.023
    },
    "41 to 45": {
      A: 0.024,
      B: 0.0237,
      C: 0.0243,
      D: 0.024,
      E: 0.0238,
      F: 0.0235,
      G: 0.0232
    },
    "46 to 50": {
      A: 0.026,
      B: 0.0255,
      C: 0.0265,
      D: 0.026,
      E: 0.0258,
      F: 0.0255,
      G: 0.0252
    },
    "51 to 60": {
      A: 0.03,
      B: 0.0295,
      C: 0.03,
      D: 0.0298,
      E: 0.0295,
      F: 0.0292,
      G: 0.029
    },
    "61+": {
      A: 0.038,
      B: 0.037,
      C: 0.0375,
      D: 0.0372,
      E: 0.037,
      F: 0.0368,
      G: 0.0365
    }
  },
  female: {
    "18 to 24": {
      A: 0.0441,
      B: 0.0469,
      C: 0.0588,
      D: 0.048,
      E: 0.046,
      F: 0.045,
      G: 0.044
    },
    "25 to 30": {
      A: 0.031,
      B: 0.032,
      C: 0.034,
      D: 0.0335,
      E: 0.033,
      F: 0.0325,
      G: 0.032
    },
    "31 to 35": {
      A: 0.028,
      B: 0.0294,
      C: 0.0336,
      D: 0.031,
      E: 0.03,
      F: 0.0295,
      G: 0.029
    },
    "36 to 40": {
      A: 0.026,
      B: 0.027,
      C: 0.029,
      D: 0.0285,
      E: 0.028,
      F: 0.0275,
      G: 0.027
    },
    "41 to 45": {
      A: 0.0265,
      B: 0.0275,
      C: 0.0295,
      D: 0.029,
      E: 0.0285,
      F: 0.028,
      G: 0.0278
    },
    "46 to 50": {
      A: 0.0285,
      B: 0.0295,
      C: 0.0315,
      D: 0.031,
      E: 0.0305,
      F: 0.03,
      G: 0.0298
    },
    "51 to 60": {
      A: 0.032,
      B: 0.033,
      C: 0.035,
      D: 0.0345,
      E: 0.034,
      F: 0.0335,
      G: 0.0332
    },
    "61+": {
      A: 0.039,
      B: 0.04,
      C: 0.0415,
      D: 0.041,
      E: 0.0405,
      F: 0.04,
      G: 0.0395
    }
  }
};

/** Canonical English brand -> insurance segment. */
export const DEFAULT_BRAND_SEGMENT_MAP: Record<string, string> = {
  Toyota: "A",
  Lexus: "A",
  Hyundai: "B",
  Kia: "B",
  Nissan: "B",
  Jeep: "C",
  BMW: "D",
  Mercedes: "D",
  "Mercedes-Benz": "D",
  Chevrolet: "B",
  Ford: "B",
  Honda: "B",
  Suzuki: "B",
  Mitsubishi: "B",
  Genesis: "B",
  MG: "B",
  Geely: "B",
  Changan: "B",
  Jetour: "B",
  Chery: "B",
  BYD: "B",
  Skoda: "B",
  Renault: "B",
  Peugeot: "B",
  GAC: "B",
  Baic: "B",
  Foton: "B",
  JAC: "B",
  Haval: "B",
  Dongfeng: "B",
  Soueast: "B",
  Hongqi: "B",
  FAW: "B",
  Kaiyi: "B",
  Isuzu: "B",
  "Land Rover": "C",
  "Range Rover": "C",
  Ferrari: "D",
  Lamborghini: "D",
  "Rolls-Royce": "D",
  Porsche: "D",
  Volkswagen: "B",
  GMC: "C",
  Fiat: "B",
  ROX: "B"
};

/** Arabic and transliteration spellings -> canonical map key. */
export const BRAND_NAME_ALIASES: Record<string, string> = {
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
  rox: "rox"
};

/** Bank parameters used when a Bank row leaves a column null. */
export const DEFAULT_BANK_FINANCE = {
  adminFeesCap: 5000,
  defaultAdminFeesPct: 0.01,
  minInsurancePremium: 1650,
  assetDepreciationRate: 0.15,
  /** Annual funds-transfer-pricing anchors, one per year of term. */
  ftpAnchors: [2.45,2.7,2.75,2.78,2.8,2.46],
  /** Cost of risk. */
  cor: 0.0108,
  /** Operating expense. */
  opex: 0.0048,
  irrTarget: 0.0621,
  minTermMonths: 12,
  maxTermMonths: 60,
} as const;

/** Choices the customer-facing calculator offers. */
export const FINANCING_OPTIONS = {
  terms: [60],
  downPaymentOptions: [0.1, 0.2, 0.3, 0.4, 0.45],
  maxDownPaymentPct: 0.45,
  balloonOptions: [0, 0.1, 0.2],
} as const;
