import { db } from "@/lib/prisma";
import { serializedCarsData } from "@/lib/helper";
import { logger } from "@/lib/logger";
import { generateIslamicOffers } from "@/lib/generate-islamic-offers";
import { buildPrismaChatCarSearchConditions } from "@/lib/car-search";
import {
  fuzzyMatchInventory,
  buildMatchWhereConditions,
} from "@/lib/chat-car-resolve";
import { getMaxAffordableMonthlyPayment } from "@/lib/chat-affordability";

/**
 * Tools the chat agent can call. The model decides what it needs instead of a
 * regex router deciding for it — that is what lets it answer questions nobody
 * wrote a keyword for.
 */

const CAR_SELECT = {
  id: true,
  make: true,
  model: true,
  year: true,
  price: true,
  mileage: true,
  color: true,
  fuelType: true,
  transmission: true,
  bodyType: true,
  driveType: true,
  seats: true,
  images: true,
  featured: true,
  isLuxury: true,
  isEconomic: true,
  isCommercial: true,
  insuranceSegment: true,
};

const DEFAULT_FINANCE_PROFILE = {
  employerSector: "حكومي مدني",
  gender: "male",
  birthDateType: "hijri",
  birthMonth: "1",
  birthYear: "1410",
  wantsDownPayment: "no",
  downPayment: "",
  hasRealEstateFinance: "no",
  hasCreditDefault: "no",
};

const SORTS = {
  cheapest: [{ price: "asc" }],
  most_expensive: [{ price: "desc" }],
  newest_year: [{ year: "desc" }],
  lowest_mileage: [{ mileage: "asc" }],
  featured: [{ featured: "desc" }, { createdAt: "desc" }],
  recently_added: [{ createdAt: "desc" }],
};

export const CHAT_AGENT_TOOLS = [
  {
    name: "search_inventory",
    description:
      "ابحث في مخزون السيارات المتاحة للبيع. استخدمها لأي سؤال عن سيارة أو ماركة أو موديل أو ميزانية أو مواصفة. يمكن دمج أكثر من فلتر معاً. اتركها بدون فلاتر لعرض المخزون العام.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "نص حر للماركة/الموديل كما كتبه العميل (عربي أو إنجليزي، حتى لو فيه أخطاء إملائية). مثال: 'كامري' أو 'hilux'.",
        },
        make: { type: "string", description: "الماركة إن كنت متأكداً منها." },
        model: { type: "string", description: "الموديل إن كنت متأكداً منه." },
        minPrice: { type: "number", description: "أقل سعر بالريال." },
        maxPrice: { type: "number", description: "أعلى سعر بالريال." },
        minYear: { type: "integer", description: "أقدم سنة صنع مقبولة." },
        maxYear: { type: "integer", description: "أحدث سنة صنع مقبولة." },
        maxMileage: { type: "integer", description: "أقصى ممشى بالكيلومترات." },
        bodyType: {
          type: "string",
          description: "نوع الهيكل كما يظهر في نظرة عامة على المخزون.",
        },
        fuelType: { type: "string", description: "نوع الوقود (بنزين، هجين، كهرباء...)." },
        transmission: { type: "string", description: "ناقل الحركة (أوتوماتيك، عادي)." },
        color: { type: "string", description: "اللون المطلوب." },
        minSeats: { type: "integer", description: "أقل عدد مقاعد مطلوب (مثلاً 7 للعائلات)." },
        luxuryOnly: { type: "boolean", description: "اقتصر على السيارات الموسومة فاخرة." },
        economicOnly: { type: "boolean", description: "اقتصر على السيارات الموسومة اقتصادية." },
        commercialOnly: {
          type: "boolean",
          description: "اقتصر على السيارات التجارية / أساطيل الشركات.",
        },
        sort: {
          type: "string",
          enum: Object.keys(SORTS),
          description: "ترتيب النتائج. الافتراضي featured.",
        },
        limit: { type: "integer", description: "عدد النتائج (1-15، الافتراضي 8)." },
      },
    },
  },
  {
    name: "get_inventory_overview",
    description:
      "نظرة عامة على المخزون: الماركات المتوفرة وعددها، مدى الأسعار والسنوات، أنواع الهياكل والوقود. استخدمها قبل الادعاء بأن شيئاً غير متوفر، أو عند سؤال عام مثل 'وش عندكم؟'.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_car_details",
    description:
      "تفاصيل كاملة لسيارة أو أكثر من نتائج سابقة (الوصف، الممشى، اللون، الدفع، فئة التأمين). استخدمها للمقارنة الدقيقة أو عند سؤال تفصيلي.",
    parameters: {
      type: "object",
      properties: {
        refs: {
          type: "array",
          items: { type: "integer" },
          description: "أرقام المرجع (ref) للسيارات من نتائج سابقة.",
        },
      },
      required: ["refs"],
    },
  },
  {
    name: "recommend_by_budget",
    description:
      "رشّح سيارات يقدر العميل على تمويلها. مرّر صافي الراتب والالتزامات الشهرية، أو أقصى قسط شهري يريده. تُحسب الأقساط من عروض البنوك الفعلية.",
    parameters: {
      type: "object",
      properties: {
        netSalary: { type: "number", description: "صافي الراتب الشهري بالريال." },
        monthlyObligations: {
          type: "number",
          description: "مجموع الالتزامات الشهرية الحالية (أقساط أخرى).",
        },
        maxMonthlyInstallment: {
          type: "number",
          description: "أقصى قسط شهري يرغب به العميل، إن ذكره صراحة.",
        },
        minSeats: {
          type: "integer",
          description: "أقل عدد مقاعد مطلوب — مرّره إن كان للعميل عائلة كبيرة.",
        },
        bodyType: { type: "string", description: "نوع الهيكل المطلوب إن حدده العميل." },
        fuelType: { type: "string", description: "نوع الوقود المطلوب إن حدده العميل." },
        make: { type: "string", description: "الماركة إن أرادها العميل تحديداً." },
        limit: { type: "integer", description: "عدد النتائج (1-15، الافتراضي 8)." },
      },
    },
  },
  {
    name: "get_financing_offers",
    description:
      "عروض التمويل الإسلامي الفعلية لسيارة محددة: القسط الشهري ومدة التمويل لكل بنك. استخدمها عند سؤال 'كم قسطها؟'.",
    parameters: {
      type: "object",
      properties: {
        ref: { type: "integer", description: "رقم مرجع السيارة من نتائج سابقة." },
        downPayment: { type: "number", description: "الدفعة الأولى إن ذكرها العميل." },
      },
      required: ["ref"],
    },
  },
  {
    name: "get_banks",
    description:
      "قائمة البنوك الشريكة مع نسب الفائدة التقريبية وشروط التمويل. استخدمها لأسئلة التمويل العامة.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_dealership_info",
    description:
      "بيانات المعرض الرسمية: الاسم، العنوان، الهاتف، الواتساب، البريد، ومناديب المبيعات. استدعِها عند طلب التواصل، أو عندما لا تستطيع الإجابة وتحتاج تحويل العميل لموظف. استدعاؤها يعرض أزرار التواصل للعميل.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "ask_to_narrow",
    description:
      "اسأل العميل سؤالاً توضيحياً واحداً مع خيارات جاهزة يضغط عليها، عندما تكون النتائج كثيرة ومتباينة ولا تستطيع ترشيح السيارة الصحيحة بثقة. استخدم خيارات مأخوذة من النتائج الفعلية فقط. لا تستدعها إن كانت النتائج متقاربة أو إن كان بإمكانك الترشيح مباشرة.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "سؤال واحد قصير وطبيعي بلهجة العميل، مثل: «تفضلها سيدان ولا دفع رباعي؟»",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description:
            "من ٢ إلى ٤ إجابات جاهزة قصيرة يضغط عليها العميل، مأخوذة من النتائج الفعلية (مثل: «سيدان»، «دفع رباعي»).",
        },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "show_cars",
    description:
      "اعرض بطاقات السيارات التي ذكرتها في ردك أمام العميل. استدعها مرة واحدة قبل كتابة الرد النهائي، وضع فقط السيارات التي تتحدث عنها فعلاً. لا تستدعها إن لم تذكر سيارات بعينها.",
    parameters: {
      type: "object",
      properties: {
        refs: {
          type: "array",
          items: { type: "integer" },
          description: "أرقام مرجع السيارات المراد عرض بطاقاتها (بحد أقصى 8).",
        },
      },
      required: ["refs"],
    },
  },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampLimit(value, fallback = 8, max = 15) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}

/** Loose ILIKE on a free-text field value the model guessed at. */
function looseContains(field, value) {
  const v = String(value || "").trim();
  return v ? { [field]: { contains: v, mode: "insensitive" } } : null;
}

const NARROWING_FACETS = [
  ["make", "الماركة"],
  ["model", "الموديل"],
  ["bodyType", "نوع الهيكل"],
  ["fuelType", "نوع الوقود"],
  ["transmission", "ناقل الحركة"],
  ["seats", "عدد المقاعد"],
];

/**
 * Which dimensions actually differ across a result set.
 *
 * Without this the model can only guess what to ask about, and it guesses
 * badly — asking "سيدان ولا دفع رباعي؟" when every result is an SUV. Handing
 * it the real axes is what turns a dump of eight cars into one useful question.
 */
function summarizeVariation(cars = []) {
  if (cars.length < 3) return undefined;

  const varies = [];
  for (const [field, label] of NARROWING_FACETS) {
    const counts = new Map();
    for (const car of cars) {
      const value = car?.[field];
      if (value == null || value === "") continue;
      const key = String(value);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (counts.size < 2) continue;
    varies.push({
      field,
      label,
      options: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([value, count]) => ({ value, count })),
    });
  }

  const prices = cars
    .map((car) => Number(car?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  let priceSpread;
  if (prices.length >= 2) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    // A near-flat price list is not something worth asking a question about.
    if (max >= min * 1.4) priceSpread = { min, max };
  }

  if (!varies.length && !priceSpread) return undefined;

  return {
    varies: varies.length ? varies : undefined,
    priceSpread,
    hint: "إن كانت هذه المحاور تغيّر فعلاً أي سيارة سترشحها، اسأل العميل سؤالاً واحداً عبر ask_to_narrow بخيارات من هذه القيم. وإن كنت تستطيع الترشيح بثقة فلا تسأل.",
  };
}

/**
 * Per-turn runtime: keeps a stable ref number for every car the agent has seen
 * so it can refer back to "ref 3" across tool calls and across turns.
 */
export function createChatToolRuntime({
  seedCars = [],
  fetchStoreInfo,
  fetchBanks,
  fetchSalesReps,
} = {}) {
  const byRef = new Map();
  const refById = new Map();
  let nextRef = 1;

  let contactRequested = false;
  let clarifier = null;
  const shownRefs = [];

  function register(cars = []) {
    return cars.map((car) => {
      const existing = refById.get(car.id);
      if (existing) {
        // Refresh with the richer record when a details call arrives later
        byRef.set(existing, { ...byRef.get(existing), ...car });
        return existing;
      }
      const ref = nextRef++;
      refById.set(car.id, ref);
      byRef.set(ref, car);
      return ref;
    });
  }

  function brief(car, ref) {
    const price = Number(car.price) || 0;
    return {
      ref,
      make: car.make,
      model: car.model,
      year: car.year,
      price: price > 0 ? price : null,
      priceNote:
        price > 0
          ? undefined
          : "السعر غير محدد — يتطلب التواصل مع الإدارة، ولا يصلح لحساب قسط",
      mileageKm: Number(car.mileage) || 0,
      color: car.color,
      fuelType: car.fuelType,
      transmission: car.transmission,
      bodyType: car.bodyType,
      seats: car.seats ?? null,
      featured: Boolean(car.featured),
      isLuxury: Boolean(car.isLuxury),
      isEconomic: Boolean(car.isEconomic),
    };
  }

  function briefAll(cars) {
    const refs = register(cars);
    return cars.map((car, i) => brief(car, refs[i]));
  }

  // Seed refs with the cars the customer is already looking at, so follow-ups
  // like "and the second one?" resolve without another search.
  if (seedCars.length) register(seedCars);

  function seededCards() {
    return seedCars.map((car) => brief(car, refById.get(car.id)));
  }

  async function queryCars(where, orderBy, limit) {
    const rows = await db.car.findMany({
      where,
      orderBy,
      take: limit,
      select: CAR_SELECT,
    });
    return rows.map((car) => serializedCarsData({ ...car, description: "" }));
  }

  async function searchInventory(args = {}) {
    const limit = clampLimit(args.limit);

    // Hard filters: the customer's answer is wrong without them.
    const hard = [{ status: "AVAILABLE" }];

    const price = {};
    if (toNumber(args.minPrice) != null) price.gte = toNumber(args.minPrice);
    if (toNumber(args.maxPrice) != null) price.lte = toNumber(args.maxPrice);
    if (Object.keys(price).length) {
      // Unpriced cars are stored as 0, so a plain `lte` budget filter would
      // return every "price on request" car and crowd out the real matches.
      if (price.gte == null) price.gte = 1;
      hard.push({ price });
    }

    const year = {};
    if (toNumber(args.minYear) != null) year.gte = Math.trunc(toNumber(args.minYear));
    if (toNumber(args.maxYear) != null) year.lte = Math.trunc(toNumber(args.maxYear));
    if (Object.keys(year).length) hard.push({ year });

    if (toNumber(args.maxMileage) != null) {
      hard.push({ mileage: { lte: Math.trunc(toNumber(args.maxMileage)) } });
    }
    if (toNumber(args.minSeats) != null) {
      hard.push({ seats: { gte: Math.trunc(toNumber(args.minSeats)) } });
    }
    if (args.luxuryOnly) hard.push({ isLuxury: true });
    if (args.economicOnly) hard.push({ isEconomic: true });
    if (args.commercialOnly) hard.push({ isCommercial: true });

    // Soft filters, listed least→most important. A guessed spelling of
    // "أوتوماتيك" must never be the reason a customer is told we have nothing,
    // so these get dropped one at a time until something matches.
    const freeText = String(args.query || "").trim();
    const soft = [];
    const pushSoft = (label, condition) => {
      if (condition) soft.push({ label, condition });
    };
    pushSoft("اللون", looseContains("color", args.color));
    pushSoft("ناقل الحركة", looseContains("transmission", args.transmission));
    pushSoft("نوع الوقود", looseContains("fuelType", args.fuelType));
    pushSoft("نوع الهيكل", looseContains("bodyType", args.bodyType));
    if (freeText) {
      const textConditions = buildPrismaChatCarSearchConditions(freeText);
      if (textConditions.length) {
        pushSoft(`البحث النصي «${freeText}»`, { AND: textConditions });
      }
    }
    pushSoft("الموديل", looseContains("model", args.model));
    pushSoft("الماركة", looseContains("make", args.make));

    const orderBy = SORTS[args.sort] || SORTS.featured;
    const active = [...soft];
    const dropped = [];

    let cars = await queryCars(
      { AND: [...hard, ...active.map((f) => f.condition)] },
      orderBy,
      limit
    );

    // Free text that matched nothing: retry through fuzzy inventory resolve
    // (typos, Arabic↔English, nicknames) before reporting "not available".
    if (!cars.length && freeText) {
      const catalog = await loadCatalog();
      const matches = fuzzyMatchInventory(freeText, catalog, {
        limit: 8,
        minScore: 0.6,
      });
      const matchConditions = buildMatchWhereConditions(matches);
      if (matchConditions.length) {
        cars = await queryCars(
          { AND: [...hard, { OR: matchConditions }] },
          orderBy,
          limit
        );
        if (cars.length) {
          const fuzzyResults = briefAll(cars);
          return {
            count: cars.length,
            matchedBy: "تقريب إملائي على أسماء المخزون",
            choicesDifferBy: summarizeVariation(fuzzyResults),
            cars: fuzzyResults,
          };
        }
      }
    }

    while (!cars.length && active.length) {
      dropped.push(active.shift().label);
      cars = await queryCars(
        { AND: [...hard, ...active.map((f) => f.condition)] },
        orderBy,
        limit
      );
    }

    if (!cars.length) {
      return {
        count: 0,
        cars: [],
        droppedFilters: dropped.length ? dropped : undefined,
        note: "لا توجد أي سيارة تطابق الشروط الأساسية (السعر/السنة/المقاعد). أخبر العميل بصراحة واقترح تعديل الميزانية أو المواصفات.",
      };
    }

    const results = briefAll(cars);
    return {
      count: cars.length,
      droppedFilters: dropped.length ? dropped : undefined,
      note: dropped.length
        ? `لم توجد نتائج مطابقة تماماً، فتم تجاهل: ${dropped.join("، ")}. هذه أقرب البدائل — وضّح للعميل أنها ليست مطابقة ١٠٠٪.`
        : undefined,
      choicesDifferBy: summarizeVariation(results),
      cars: results,
    };
  }

  let catalogCache = null;
  async function loadCatalog() {
    if (catalogCache) return catalogCache;
    const rows = await db.car.findMany({
      where: { status: "AVAILABLE" },
      select: { make: true, model: true },
      distinct: ["make", "model"],
    });
    const pairs = rows
      .map((r) => ({
        make: String(r.make || "").trim(),
        model: String(r.model || "").trim(),
      }))
      .filter((p) => p.make && p.model);
    catalogCache = {
      makes: [...new Set(pairs.map((p) => p.make))],
      models: [...new Set(pairs.map((p) => p.model))],
      pairs,
    };
    return catalogCache;
  }

  async function inventoryOverview() {
    const [byMake, byBody, byFuel, aggregate] = await Promise.all([
      db.car.groupBy({
        by: ["make"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
        orderBy: { _count: { make: "desc" } },
      }),
      db.car.groupBy({
        by: ["bodyType"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
      db.car.groupBy({
        by: ["fuelType"],
        where: { status: "AVAILABLE" },
        _count: { _all: true },
      }),
      db.car.aggregate({
        where: { status: "AVAILABLE", price: { gt: 0 } },
        _count: { _all: true },
        _min: { price: true, year: true },
        _max: { price: true, year: true },
      }),
    ]);

    const catalog = await loadCatalog();

    return {
      totalAvailable: aggregate._count._all,
      priceRange: {
        min: Number(aggregate._min.price) || null,
        max: Number(aggregate._max.price) || null,
      },
      yearRange: { min: aggregate._min.year, max: aggregate._max.year },
      makes: byMake.map((m) => ({ make: m.make, count: m._count._all })),
      bodyTypes: byBody.map((b) => ({ bodyType: b.bodyType, count: b._count._all })),
      fuelTypes: byFuel.map((f) => ({ fuelType: f.fuelType, count: f._count._all })),
      modelsInStock: catalog.pairs.slice(0, 60).map((p) => `${p.make} ${p.model}`),
      usageNote:
        "هذه أسماء فقط بلا أسعار أو أرقام مرجع. لا تذكر أي سيارة منها للعميل قبل جلبها عبر search_inventory، وإلا لن تظهر بطاقتها ولن يكون لديك سعرها.",
    };
  }

  async function carDetails(args = {}) {
    const refs = Array.isArray(args.refs) ? args.refs.slice(0, 6) : [];
    const ids = refs.map((ref) => byRef.get(Number(ref))?.id).filter(Boolean);
    if (!ids.length) {
      return { error: "لا توجد سيارات بهذه الأرقام. ابحث أولاً باستخدام search_inventory." };
    }

    const rows = await db.car.findMany({
      where: { id: { in: ids } },
      select: { ...CAR_SELECT, description: true, testDriveAvailable: true },
    });
    const cars = rows.map((car) => serializedCarsData(car));
    const assignedRefs = register(cars);

    return {
      cars: cars.map((car, i) => ({
        ...brief(car, assignedRefs[i]),
        driveType: car.driveType || null,
        insuranceSegment: car.insuranceSegment || null,
        testDriveAvailable: Boolean(car.testDriveAvailable),
        description: String(car.description || "").slice(0, 600) || null,
      })),
    };
  }

  function offersForCar(car, banks, downPayment) {
    const { offers, pricingBlocked, pricingBlockReason } = generateIslamicOffers({
      banks,
      formData: {
        ...DEFAULT_FINANCE_PROFILE,
        ...(toNumber(downPayment)
          ? { wantsDownPayment: "yes", downPayment: String(toNumber(downPayment)) }
          : {}),
      },
      car,
    });
    if (pricingBlocked) return { blocked: true, reason: pricingBlockReason };
    return { blocked: false, offers: offers || [] };
  }

  async function recommendByBudget(args = {}) {
    const netSalary = toNumber(args.netSalary);
    const obligations = toNumber(args.monthlyObligations) || 0;
    const explicitMax = toNumber(args.maxMonthlyInstallment);

    if (!netSalary && !explicitMax) {
      return {
        error:
          "أحتاج صافي الراتب الشهري أو أقصى قسط يرغب به العميل. اسأله بجملة واحدة قصيرة.",
      };
    }

    const maxPayment = explicitMax
      ? explicitMax
      : getMaxAffordableMonthlyPayment(netSalary, obligations);

    if (maxPayment <= 0) {
      return {
        maxMonthlyPayment: 0,
        count: 0,
        cars: [],
        note: "الالتزامات الشهرية تستهلك الدخل المتاح — لا يوجد هامش قسط. اقترح على العميل التواصل مع المختص.",
      };
    }

    const banks = (await fetchBanks?.()) || [];
    if (!banks.length) {
      return { error: "لا توجد بيانات بنوك متاحة الآن — وجّه العميل لطلب التمويل من صفحة السيارة." };
    }

    const poolFilters = [{ status: "AVAILABLE" }, { price: { gt: 0 } }];
    if (toNumber(args.minSeats) != null) {
      poolFilters.push({ seats: { gte: Math.trunc(toNumber(args.minSeats)) } });
    }
    for (const [field, value] of [
      ["make", args.make],
      ["bodyType", args.bodyType],
      ["fuelType", args.fuelType],
    ]) {
      const condition = looseContains(field, value);
      if (condition) poolFilters.push(condition);
    }

    const pool = await queryCars({ AND: poolFilters }, [{ price: "asc" }], 60);
    if (!pool.length) {
      return {
        maxMonthlyPayment: Math.round(maxPayment),
        count: 0,
        cars: [],
        note: "لا توجد سيارات مسعّرة تطابق هذه المواصفات أصلاً — أخبر العميل بصراحة واقترح تخفيف أحد الشروط.",
      };
    }

    const affordable = [];
    for (const car of pool) {
      const { blocked, offers } = offersForCar(car, banks, null);
      if (blocked) continue;
      const best = offers
        .filter((o) => Number(o?.monthlyPayment) > 0)
        .sort((a, b) => Number(a.monthlyPayment) - Number(b.monthlyPayment))[0];
      if (best && Number(best.monthlyPayment) <= maxPayment) {
        affordable.push({ car, best });
      }
      if (affordable.length >= clampLimit(args.limit)) break;
    }

    const refs = register(affordable.map((a) => a.car));

    return {
      maxMonthlyPayment: Math.round(maxPayment),
      basis: explicitMax
        ? "أقصى قسط ذكره العميل"
        : `نسبة استقطاع ${35}% من الدخل المتاح بعد الالتزامات`,
      count: affordable.length,
      candidatesChecked: pool.length,
      note: affordable.length
        ? undefined
        : `لا توجد سيارة بهذه المواصفات ضمن قسط ${Math.round(maxPayment).toLocaleString("ar-SA")} ر.س. كن صادقاً مع العميل، واذكر أقرب خيار سعراً واقترح دفعة أولى أو مواصفات أقل.`,
      cheapestMatchingPrice: pool.length ? Number(pool[0].price) : null,
      cars: affordable.map((entry, i) => ({
        ...brief(entry.car, refs[i]),
        estimatedMonthly: Math.round(Number(entry.best.monthlyPayment)),
        bank: entry.best.bankName || null,
        months: entry.best.termMonths || null,
      })),
      disclaimer: "الأقساط تقديرية بافتراضات مبدئية وتتغيّر حسب ملف العميل الفعلي.",
    };
  }

  async function financingOffers(args = {}) {
    const car = byRef.get(Number(args.ref));
    if (!car) {
      return { error: "رقم المرجع غير معروف. ابحث عن السيارة أولاً." };
    }
    if (!(Number(car.price) > 0)) {
      return {
        error: `سعر ${car.make} ${car.model} غير محدد في النظام، لذلك لا يمكن حساب قسط. اطلب من العميل التواصل مع الإدارة.`,
      };
    }

    const banks = (await fetchBanks?.()) || [];
    const { blocked, reason, offers } = offersForCar(car, banks, args.downPayment);
    if (blocked) return { error: reason || "تعذّر حساب العروض." };

    return {
      car: brief(car, Number(args.ref)),
      offers: offers.slice(0, 6).map((o) => ({
        bank: o.bankName || null,
        monthlyPayment: Math.round(Number(o.monthlyPayment) || 0),
        months: o.termMonths || null,
        downPayment: Math.round(Number(o.downPayment) || 0),
        balloonPayment: Math.round(Number(o.balloonPayment) || 0) || undefined,
        totalPayment: Math.round(Number(o.totalPayment) || 0),
      })),
      disclaimer: "تقديري — الرقم النهائي يعتمد على موافقة البنك وملف العميل.",
    };
  }

  async function banksInfo() {
    const banks = (await fetchBanks?.()) || [];
    if (!banks.length) {
      return {
        banks: [],
        note: "لا توجد بنوك مسجلة حالياً — وجّه العميل لطلب التمويل من صفحة السيارة.",
      };
    }
    return {
      banks: banks.map((b) => ({
        name: b.name,
        annualRatePercent: b.interestRate != null ? Number(b.interestRate) : null,
        policy: b.loanPolicy?.trim() || null,
      })),
    };
  }

  async function dealershipInfo() {
    contactRequested = true;
    const [store, reps] = await Promise.all([
      fetchStoreInfo?.() ?? null,
      fetchSalesReps?.() ?? [],
    ]);
    return {
      name: store?.name || null,
      phone: store?.phone || null,
      whatsapp: store?.whatsapp || null,
      email: store?.email || null,
      address: [store?.address, store?.city, store?.country].filter(Boolean).join("، ") || null,
      about: store?.description || null,
      salesReps: (reps || []).map((r) => ({ name: r.name, city: r.city || null })),
      services: [
        "بيع سيارات متوفرة في المعرض",
        "تمويل إسلامي عبر البنوك الشريكة",
        "حجز تجربة قيادة من صفحة السيارة",
        "عروض الشركات والمؤسسات",
      ],
      uiNote: "أزرار الاتصال/الواتساب ستظهر للعميل تلقائياً أسفل ردك — لا تكتب الأرقام في النص.",
    };
  }

  function askToNarrow(args = {}) {
    const question = String(args.question || "").trim();
    const options = (Array.isArray(args.options) ? args.options : [])
      .map((option) => String(option || "").trim())
      .filter(Boolean)
      .slice(0, 4);

    if (!question || options.length < 2) {
      return {
        error:
          "أحتاج سؤالاً واحداً و٢-٤ خيارات قصيرة. إن لم تستطع صياغتها فرشّح مباشرة بدل السؤال.",
      };
    }

    clarifier = { question, options };
    return {
      ok: true,
      uiNote:
        "ستظهر الخيارات كأزرار أسفل ردك. اطرح السؤال في نصّك بصيغة طبيعية ولا تعدّد الخيارات كقائمة مرقّمة.",
    };
  }

  function showCars(args = {}) {
    const refs = Array.isArray(args.refs) ? args.refs : [];
    const picked = refs
      .map((ref) => Number(ref))
      .filter((ref) => byRef.has(ref))
      .slice(0, 8);
    shownRefs.length = 0;
    shownRefs.push(...picked);
    return {
      ok: true,
      shown: picked.length,
      ignored: refs.length - picked.length || undefined,
    };
  }

  const handlers = {
    search_inventory: searchInventory,
    get_inventory_overview: inventoryOverview,
    get_car_details: carDetails,
    recommend_by_budget: recommendByBudget,
    get_financing_offers: financingOffers,
    get_banks: banksInfo,
    get_dealership_info: dealershipInfo,
    ask_to_narrow: askToNarrow,
    show_cars: showCars,
  };

  return {
    async execute(name, args) {
      const handler = handlers[name];
      if (!handler) return { error: `أداة غير معروفة: ${name}` };
      const started = Date.now();
      const result = await handler(args || {});
      logger.debug("[chat-agent] tool", {
        name,
        ms: Date.now() - started,
        args,
      });
      return result;
    },
    getShownCars() {
      return shownRefs.map((ref) => byRef.get(ref)).filter(Boolean);
    },
    getSeenCars() {
      return [...byRef.values()];
    },
    wantsContactActions() {
      return contactRequested;
    },
    getClarifier() {
      return clarifier;
    },
    seededCards,
    lookupRef(ref) {
      return byRef.get(Number(ref)) || null;
    },
  };
}
