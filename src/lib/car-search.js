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
  ["camry", "كامري", "كامرى", "كامر"],
  ["corolla", "كورولا", "كورلا", "كوروللا"],
  ["hilux", "هايلكس", "هيلكس", "هايلوكس"],
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
  ["cerato", "سيراتو"],
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

function isAliasMatch(normalizedTerm, normalizedAlias) {
  if (!normalizedTerm || !normalizedAlias) return false;
  if (normalizedTerm === normalizedAlias) return true;
  if (normalizedAlias.includes(normalizedTerm)) return true;
  if (normalizedTerm.includes(normalizedAlias)) return true;

  const minPrefixLength = 2;
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

  for (const aliasGroup of SEARCH_ALIASES) {
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

  if (!normalizedSearch) return [];

  const rawTokens = normalizedSearch
    .split(" ")
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));

  if (rawTokens.length <= 1) {
    return [expandTerm(trimmedSearch || normalizedSearch)];
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
