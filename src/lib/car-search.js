const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const ARABIC_TATWEEL = /\u0640/g;

const ARABIC_FLEXIBLE_CHARS = {
  "\u0627": ["\u0627", "\u0623", "\u0625", "\u0622"], // ا أ إ آ
  "\u0647": ["\u0647", "\u0629"], // ه ة
  "\u064A": ["\u064A", "\u0649", "\u0626"], // ي ى ئ
  "\u0648": ["\u0648", "\u0624"], // و ؤ
};

const SEARCH_STOP_WORDS = new Set([
  "سيارة",
  "سيارات",
  "للبيع",
  "بيع",
  "ابحث",
  "عن",
  "موديل",
  "موديلات",
  "car",
  "cars",
  "for",
  "sale",
]);

let dynamicAliasGroups = [];

export function registerDynamicAliases(groups = []) {
  dynamicAliasGroups = Array.isArray(groups) ? groups : [];
}

function getAllAliasGroups() {
  return [...SEARCH_ALIASES, ...dynamicAliasGroups];
}

export function buildDynamicAliasGroups(inventoryRows = []) {
  const groups = [];
  const seen = new Set();

  for (const row of inventoryRows) {
    for (const value of [row?.make, row?.model]) {
      const trimmed = String(value || "").trim();
      if (!trimmed || trimmed.length < 2) continue;
      const key = normalizeSearchText(trimmed);
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push([trimmed]);
    }
  }

  return groups;
}

const SEARCH_ALIASES = [
  ["toyota", "تويوتا", "تيوتا"],
  ["honda", "هوندا"],
  ["nissan", "نيسان", "نيسانن"],
  ["hyundai", "هيونداي", "هونداي", "هيواندي"],
  ["kia", "كيا"],
  ["ford", "فورد"],
  ["chevrolet", "شيفروليه", "شفروليه", "شفر"],
  ["bmw", "بي ام دبليو", "بي ام", "بي إم دبليو"],
  ["mercedes", "مرسيدس", "مرسيدس بنز"],
  ["lexus", "لكزس", "ليكسس"],
  ["mazda", "مازدا"],
  ["mitsubishi", "ميتسوبيشي"],
  ["jeep", "جيب"],
  ["range rover", "رنج روفر", "رينج روفر"],
  ["rolls-royce", "rolls royce", "رولز رويس", "رولز"],
  ["spectre", "سبيكتر", "سبكتر"],
  ["camry", "كامري", "كامرى", "كامر"],
  ["corolla", "كورولا", "كورلا", "كوروللا"],
  ["hilux", "هايلكس", "هيلكس", "هايلوكس"],
  ["highlander", "هايلاندر", "هايلندر", "هاي لاندر"],
  ["land cruiser", "لاندكروزر", "لاند كروزر", "جيب تويوتا"],
  ["yaris", "يارس", "ياريس"],
  ["innova", "إنوفا", "انوفا", "innova crysta", "إنوفا crysta"],
  ["accord", "اكورد", "أكورد"],
  ["civic", "سيفيك", "سفك"],
  ["altima", "التيما", "ألتيما"],
  ["patrol", "باترول"],
  ["sunny", "صني"],
  ["elantra", "النترا", "إلنترا", "النترا"],
  ["accent", "اكسنت", "أكسنت"],
  ["sonata", "سوناتا"],
  ["tucson", "توسان", "توكسون"],
  ["sportage", "سبورتاج"],
  ["cerato", "سيراتو", "سراتو"],
  ["cruze", "كروز", "كروس"],
  ["optima", "اوبتيما", "أوبتيما"],
  ["tahoe", "تاهو"],
  ["explorer", "اكسبلورر", "إكسبلورر"],
  ["white", "ابيض", "أبيض", "بيضاء"],
  ["black", "اسود", "أسود", "سوداء"],
  ["red", "احمر", "أحمر", "حمراء"],
  ["blue", "ازرق", "أزرق", "زرقاء"],
  ["silver", "فضي", "فضية"],
  ["gray", "رمادي", "رمادية", "grey"],
  ["gold", "ذهبي", "ذهبية"],
  ["green", "اخضر", "أخضر", "خضراء"],
  ["gasoline", "بنزين"],
  ["diesel", "ديزل"],
  ["electric", "كهربائي", "كهربائية"],
  ["hybrid", "هجين", "هايبرد"],
  ["automatic", "اوتوماتيك", "أوتوماتيك", "اتوماتيك"],
  ["manual", "يدوي", "عادي"],
  ["sedan", "سيدان"],
  ["suv", "اس يو في", "إس يو في", "دفع رباعي"],
  ["pickup", "بيك اب", "بيك أب"],
];

const SEARCHABLE_CAR_FIELDS = [
  "make",
  "model",
  "description",
  "color",
  "bodyType",
  "fuelType",
  "transmission",
  "category",
  "driveType",
];

export function normalizeSearchText(value = "") {
  return value
    .toString()
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_TATWEEL, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getArabicCharAlternatives(char) {
  return ARABIC_FLEXIBLE_CHARS[char] || [char];
}

export function buildArabicSpellingVariants(term = "", maxVariants = 48) {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const variants = new Set([trimmed]);
  const normalized = normalizeSearchText(trimmed);
  variants.add(normalized);

  const chars = [...normalized];
  let combinations = [""];

  for (const char of chars) {
    const alternatives = getArabicCharAlternatives(char);
    const next = [];

    for (const prefix of combinations) {
      for (const alternative of alternatives) {
        next.push(prefix + alternative);
        if (next.length >= maxVariants) break;
      }
      if (next.length >= maxVariants) break;
    }

    combinations = next.length > 0 ? next : combinations;
    if (combinations.length >= maxVariants) {
      combinations = combinations.slice(0, maxVariants);
      break;
    }
  }

  for (const value of combinations) {
    if (value.length > 1) {
      variants.add(value);
    }
  }

  return [...variants];
}

function isCompleteWordMatch(term, text) {
  if (!term || !text) return false;
  if (term === text) return true;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "u").test(text);
}

function isAliasMatch(normalizedTerm, normalizedAlias) {
  if (!normalizedTerm || !normalizedAlias) return false;
  if (normalizedTerm === normalizedAlias) return true;

  const termParts = normalizedTerm.split(" ").filter(Boolean);
  const aliasParts = normalizedAlias.split(" ").filter(Boolean);

  if (termParts.length === 1) {
    const term = termParts[0];
    if (aliasParts.some((part) => part === term)) return true;
    if (aliasParts.some((part) => part.startsWith(term) && part.length > term.length)) {
      return false;
    }
    if (aliasParts.some((part) => term.startsWith(part) && term.length > part.length)) {
      return false;
    }
    if (isCompleteWordMatch(term, normalizedAlias)) return true;
    if (term.length >= 5 && normalizedAlias.startsWith(term)) return true;
    if (normalizedTerm.length >= 5 && normalizedTerm.startsWith(normalizedAlias)) {
      return true;
    }
    return false;
  }

  if (normalizedAlias.includes(normalizedTerm)) return true;
  if (normalizedTerm.includes(normalizedAlias)) return true;

  const minPrefixLength = 3;
  if (
    normalizedTerm.length >= minPrefixLength &&
    normalizedAlias.startsWith(normalizedTerm)
  ) {
    return true;
  }

  if (
    normalizedAlias.length >= minPrefixLength &&
    normalizedTerm.startsWith(normalizedAlias)
  ) {
    return true;
  }

  return false;
}

function expandTerm(term) {
  const normalizedTerm = normalizeSearchText(term);
  const variants = new Set(buildArabicSpellingVariants(term));

  for (const aliasGroup of getAllAliasGroups()) {
    const normalizedAliases = aliasGroup.map(normalizeSearchText);
    const matched = normalizedAliases.some((alias) =>
      isAliasMatch(normalizedTerm, alias)
    );

    if (matched) {
      aliasGroup.forEach((alias) => variants.add(alias));
    }
  }

  return [...variants].filter((value) => value && value.length > 1);
}

export function buildSearchTokenGroups(search = "") {
  const trimmedSearch = search.trim();
  const normalizedSearch = normalizeSearchText(trimmedSearch);
  const normalizedStopWords = new Set(
    [...SEARCH_STOP_WORDS].map((word) => normalizeSearchText(word))
  );

  if (!normalizedSearch) return [];

  const rawTokens = normalizedSearch
    .split(" ")
    .filter(
      (token) => token.length > 1 && !normalizedStopWords.has(token)
    );

  if (rawTokens.length === 0) {
    return [];
  }

  if (rawTokens.length === 1) {
    return [expandTerm(rawTokens[0])];
  }

  return rawTokens.map(expandTerm).filter((group) => group.length > 0);
}

function buildPrismaTermCondition(term) {
  const conditions = SEARCHABLE_CAR_FIELDS.map((field) => ({
    [field]: { contains: term, mode: "insensitive" },
  }));

  if (/^\d{4}$/.test(term)) {
    conditions.push({ year: parseInt(term, 10) });
  }

  return conditions;
}

export function buildPrismaCarSearchConditions(search = "") {
  return buildSearchTokenGroups(search).map((termGroup) => ({
    OR: termGroup.flatMap(buildPrismaTermCondition),
  }));
}

export function buildMakeFilterVariants(make = "") {
  const trimmed = make.trim();
  if (!trimmed) return [];

  const variants = new Set([trimmed]);
  for (const alias of expandTerm(trimmed)) {
    variants.add(alias);
  }

  return [...variants].filter(Boolean);
}

export function buildPrismaMakeCondition(make = "") {
  const variants = buildMakeFilterVariants(make);
  if (variants.length === 0) return null;

  if (variants.length === 1) {
    return { make: { contains: variants[0], mode: "insensitive" } };
  }

  return {
    OR: variants.map((term) => ({
      make: { contains: term, mode: "insensitive" },
    })),
  };
}

export function buildSupabaseMakeFilters(make = "") {
  return buildMakeFilterVariants(make)
    .map((term) => `make.ilike.%${escapeSupabaseLike(term)}%`)
    .join(",");
}

export function escapeSupabaseLike(value = "") {
  return value.replace(/[%,]/g, " ").trim();
}

export function buildSupabaseCarSearchGroups(search = "") {
  return buildSearchTokenGroups(search)
    .map((termGroup) =>
      termGroup
        .map(escapeSupabaseLike)
        .filter(Boolean)
        .flatMap((term) => {
          const pattern = `%${term}%`;
          const filters = SEARCHABLE_CAR_FIELDS.map(
            (field) => `${field}.ilike.${pattern}`
          );

          if (/^\d{4}$/.test(term)) {
            filters.push(`year.eq.${term}`);
          }

          return filters;
        })
        .join(",")
    )
    .filter(Boolean);
}

function trimSearchLabel(value = "") {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function inventoryTermsMatch(source = "", target = "") {
  const normalizedSource = normalizeSearchText(source);
  const normalizedTarget = normalizeSearchText(target);

  if (!normalizedSource || !normalizedTarget) return false;
  if (normalizedSource === normalizedTarget) return true;
  if (
    normalizedSource.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedSource)
  ) {
    return true;
  }

  const sourceVariants = expandTerm(source).map(normalizeSearchText);
  const targetVariants = expandTerm(target).map(normalizeSearchText);

  return sourceVariants.some(
    (variant) =>
      targetVariants.includes(variant) ||
      targetVariants.some(
        (targetVariant) =>
          variant.includes(targetVariant) || targetVariant.includes(variant)
      )
  );
}

export function buildImageSearchQuery(make = "", model = "") {
  return [trimSearchLabel(make), trimSearchLabel(model)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function resolveImageSearchDetails(
  { make = "", model = "" } = {},
  inventory = []
) {
  const normalizedInventory = inventory
    .map((row) => ({
      make: trimSearchLabel(row.make),
      model: trimSearchLabel(row.model),
    }))
    .filter((row) => row.make && row.model);

  let resolvedMake = trimSearchLabel(make);
  let resolvedModel = trimSearchLabel(model);

  const uniqueMakes = [...new Set(normalizedInventory.map((row) => row.make))];
  const matchedMake = uniqueMakes.find((dbMake) =>
    inventoryTermsMatch(make, dbMake)
  );

  if (matchedMake) {
    resolvedMake = matchedMake;
  }

  const modelPool = matchedMake
    ? normalizedInventory.filter((row) => row.make === matchedMake)
    : normalizedInventory;
  const uniqueModels = [...new Set(modelPool.map((row) => row.model))];
  const matchedModel = uniqueModels.find((dbModel) =>
    inventoryTermsMatch(model, dbModel)
  );

  if (matchedModel) {
    resolvedModel = matchedModel;
  }

  const searchQuery = buildImageSearchQuery(resolvedMake, resolvedModel);

  return {
    make: resolvedMake,
    model: resolvedModel,
    searchQuery,
  };
}

const EASTERN_ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function parseWesternDigits(value = "") {
  return String(value).replace(/[٠-٩]/g, (digit) => {
    const index = EASTERN_ARABIC_DIGITS.indexOf(digit);
    return index >= 0 ? String(index) : digit;
  });
}

function parseAmountToken(rawValue = "", unit = "") {
  const cleaned = parseWesternDigits(String(rawValue || ""))
    .replace(/,/g, "")
    .trim();
  let amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedUnit = normalizeSearchText(unit || "");
  if (
    /الف|الف|k/.test(normalizedUnit) ||
    /الف|الف|k/.test(normalizeSearchText(String(rawValue)))
  ) {
    amount *= 1000;
  }

  return Math.round(amount);
}

export function parseBudgetFromQuery(text = "") {
  const normalized = parseWesternDigits(String(text || ""));
  let minPrice = null;
  let maxPrice = null;

  const rangeMatch = normalized.match(
    /(?:من|between)\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?\s*(?:الى|إلى|to|-)\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i
  );
  if (rangeMatch) {
    minPrice = parseAmountToken(rangeMatch[1], rangeMatch[2]);
    maxPrice = parseAmountToken(rangeMatch[3], rangeMatch[4]);
    return { minPrice, maxPrice };
  }

  const maxPatterns = [
    /(?:أقل\s*من|اقل\s*من|تحت|لا\s*تتجاوز|under|below|max|maximum|up\s*to)\s*(?:من)?\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i,
    /(?:ميزاني(?:ة|تي)?|budget)\s*(?:حوالي|تقريبا|تقريباً)?\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i,
    /([\d,.]+)\s*(ألف|الف|k|K)\s*(?:ريال)?\s*(?:أقل|تحت|او\s*اقل)/i,
  ];

  for (const pattern of maxPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      maxPrice = parseAmountToken(match[1], match[2]);
      break;
    }
  }

  const minPatterns = [
    /(?:أكثر\s*من|اكثر\s*من|فوق|أعلى\s*من|اعلى\s*من|above|over|min|minimum|from)\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i,
  ];

  for (const pattern of minPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      minPrice = parseAmountToken(match[1], match[2]);
      break;
    }
  }

  if (!maxPrice) {
    const plainBudget = normalized.match(
      /(?:بسعر|بميزانية|سعر|price)\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i
    );
    if (plainBudget) {
      maxPrice = parseAmountToken(plainBudget[1], plainBudget[2]);
    }
  }

  return { minPrice, maxPrice };
}

export function parseSalaryFromQuery(text = "") {
  const normalized = parseWesternDigits(String(text || ""));
  let netSalary = null;
  let totalMonthlyObligations = 0;

  const salaryMatch =
    normalized.match(
      /(?:راتب(?:ي)?|صافي\s*الراتب|دخلي|salary|income)\s*(?:هو|عن|≈|=\s*)?\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i
    ) ||
    normalized.match(
      /([\d,.]+)\s*(ألف|الف|k|K)?\s*(?:ريال)?\s*(?:راتب|صافي)/i
    );

  if (salaryMatch) {
    netSalary = parseAmountToken(salaryMatch[1], salaryMatch[2]);
  }

  const obligationsMatch = normalized.match(
    /(?:التزامات(?:ي)?|التزام|قسط\s*شهري|obligations?)\s*(?:هي|عن|≈|=\s*)?\s*([\d,.]+)\s*(ألف|الف|k|K|ريال)?/i
  );
  if (obligationsMatch) {
    totalMonthlyObligations =
      parseAmountToken(obligationsMatch[1], obligationsMatch[2]) || 0;
  }

  if (/بدون\s*التزام|لا\s*يوجد\s*التزام|0\s*التزام/i.test(normalized)) {
    totalMonthlyObligations = 0;
  }

  return { netSalary, totalMonthlyObligations };
}

export function wantsLuxuryCars(text = "") {
  const normalized = normalizeSearchText(text);
  const luxuryKeywords = [
    "فاخر",
    "فاخرة",
    "فاره",
    "فارهة",
    "luxury",
    "luxurious",
    "prestige",
    "راقي",
    "راقية",
    "فخم",
    "فخمة",
  ];
  return luxuryKeywords.some((kw) => normalized.includes(kw));
}

export function buildChatSearchQuery(query = "", conversationHistory = []) {
  const searchTerms = normalizeSearchText(query);
  const generalFollowUpQueries = [
    "متوفر",
    "متاح",
    "available",
    "show",
    "عرض",
    "اعرض",
    "كل",
    "جميع",
    "all",
    "السيارات",
    "cars",
    "ايه",
    "ايش",
    "what",
  ];

  const isGeneralFollowUp =
    generalFollowUpQueries.some((term) => searchTerms.includes(term)) &&
    searchTerms.split(/\s+/).length <= 4;

  if (!conversationHistory.length) {
    return query;
  }

  const recentUserMessages = conversationHistory
    .filter((msg) => msg.sender === "user")
    .slice(-3)
    .map((msg) => msg.text)
    .join(" ");

  if (isGeneralFollowUp && recentUserMessages) {
    return `${recentUserMessages} ${query}`.trim();
  }

  return `${recentUserMessages} ${query}`.trim();
}
