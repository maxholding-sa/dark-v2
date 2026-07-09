const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

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
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandTerm(term) {
  const normalizedTerm = normalizeSearchText(term);
  const variants = new Set([term.trim(), normalizedTerm]);

  for (const aliasGroup of SEARCH_ALIASES) {
    const normalizedAliases = aliasGroup.map(normalizeSearchText);
    const matched = normalizedAliases.some(
      (alias) =>
        alias === normalizedTerm ||
        alias.includes(normalizedTerm) ||
        normalizedTerm.includes(alias)
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
