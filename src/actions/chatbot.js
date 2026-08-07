"use server";

import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serializedCarsData } from "@/lib/helper";
import { generateOpenAIText } from "@/lib/openai";
import {
  ensureChatConversation,
  appendChatMessages,
  updateChatConversationState,
  getConversationById,
  resolveClerkUserId,
} from "@/actions/chat-conversation";
import {
  startLoanFlow,
  selectCarForLoan,
  selectOfferForLoan,
  handleLoanChatTurn,
} from "@/actions/chat-loan";
import {
  startCompareFlow,
  selectCarForCompare,
  handleCompareCarSearch,
  handleChangeCompareRequest,
  tryOneShotCompare,
} from "@/actions/chat-compare";
import {
  LOAN_CHAT_MODES,
  emptyLoanState,
  wantsCancelLoanFlow,
} from "@/lib/chat-loan-intake";
import {
  isCompareMode,
  wantsCompareFlow,
  wantsCancelCompareFlow,
  parseChangeCompareSlot,
  wantsRankingAmongResults,
  parseCompareEntities,
} from "@/lib/chat-compare";
import {
  searchCarsForChat,
  fetchEconomicalCarsForChat,
  fetchLatestOfferCarsForChat,
  fetchAllAvailableCarsForChat,
} from "@/lib/chat-car-search";
import {
  filterCarsByAffordability,
  filterCarsByMaxInstallment,
  parseAffordabilityFromText,
  parseMaxInstallmentFromText,
  wantsSalaryRecommendation,
  wantsInstallmentBudget,
  getMaxAffordableMonthlyPayment,
} from "@/lib/chat-affordability";
import { parseBudgetFromQuery, normalizeSearchText } from "@/lib/car-search";
import { getPublicMandebs } from "@/actions/mandeb";
// قاموس للكتابات البديلة والأخطاء الإملائية الشائعة في اللغة العربية
const arabicSpellingVariations = {
  // أخطاء شائعة في كلمات السيارات
  "هايلوكس": "هايلكس",
  "هايلوكز": "هايلكس",
  "هيلكس": "هايلكس",
  "هيلوكس": "هايلكس",
  "هليكس": "هايلكس",
  "هاي لوكس": "هايلكس",
  "هاي لكس": "هايلكس",

  // أخطاء في ماركات السيارات
  "تويتا": "تويوتا",
  "تايوتا": "تويوتا",
  "تيوتا": "تويوتا",
  "تويته": "تويوتا",
  "تايوته": "تويوتا",
  "توتا": "تويوتا",  // إضافة جديدة
  "تويت": "تويوتا", // إضافة جديدة
  "توياتا": "تويوتا", // إضافة جديدة
  "تاتا": "تويوتا", // إضافة جديدة
  
  "هونداي": "هيونداي",
  "هايونداي": "هيونداي",
  "هونداى": "هيونداي",
  "هايوندا": "هيونداي",
  "هايونده": "هيونداي",
  "هوندا": "هيونداي", // إضافة جديدة
  "هونده": "هيونداي", // إضافة جديدة
  "هيوندا": "هيونداي", // إضافة جديدة
  
  "نيسان": "نيسان", // القيمة الصحيحة
  "نسان": "نيسان",
  "نيسسان": "نيسان",
  "نيصان": "نيسان",
  "نيس": "نيسان",
  "نسن": "نيسان", // إضافة جديدة
  "نيسن": "نيسان", // إضافة جديدة
  
  "شفروليه": "شيفروليه",
  "شيفرولي": "شيفروليه",
  "شافروليه": "شيفروليه",
  "شفروليت": "شيفروليه",
  "شفرولت": "شيفروليه",
  "شيفرولت": "شيفروليه", // إضافة جديدة
  "شفرله": "شيفروليه", // إضافة جديدة
  "شيفله": "شيفروليه", // إضافة جديدة
  
  // العلامات التجارية الإضافية والاختصارات الشائعة
  "بي ام": "BMW",
  "بيام": "BMW", 
  "bmw": "BMW",
  "BMW": "BMW",
  
  "مرسيدس": "مرسيدس",
  "مرسيدز": "مرسيدس",
  "مرسدس": "مرسيدس",
  "مرسيدس بنز": "مرسيدس",
  
  "فورد": "فورد",
  "فرد": "فورد",
  "فود": "فورد",
  
  "كيا": "كيا",
  "كيه": "كيا",
  "كيأ": "كيا",
  
  "مازدا": "مازدا",
  "مزدا": "مازدا",
  "مازده": "مازدا",
  
  // تصحيح الأخطاء الإملائية في الكلمات الإنجليزية
  // English spelling corrections for car brands and models
  "toyta": "toyota",
  "toyata": "toyota", 
  "toyoya": "toyota",
  "totoya": "toyota",
  "tyota": "toyota",
  "toyoto": "toyota",
  
  "honda": "honda", // القيمة الصحيحة
  "hunda": "honda",
  "hoda": "honda",
  "hondaa": "honda",
  
  "hyundai": "hyundai", // القيمة الصحيحة
  "hyunday": "hyundai",
  "hunday": "hyundai",
  "hyundai": "hyundai",
  "huyndai": "hyundai",
  "hyuandai": "hyundai",
  
  "nissan": "nissan", // القيمة الصحيحة
  "nisan": "nissan",
  "nisssan": "nissan",
  "nisssn": "nissan",
  "nissen": "nissan",
  "nisaan": "nissan",
  
  "chevrolet": "chevrolet", // القيمة الصحيحة
  "chevrolat": "chevrolet",
  "chevrlet": "chevrolet",
  "chevrolit": "chevrolet",
  "chevroleet": "chevrolet",
  "chevy": "chevrolet",
  
  "mercedes": "mercedes", // القيمة الصحيحة
  "mercedez": "mercedes",
  "mercades": "mercedes",
  "mercedees": "mercedes",
  "mersedes": "mercedes",
  "mercedes-benz": "mercedes",
  "mercedesbenz": "mercedes",
  
  "volkswagen": "volkswagen", // القيمة الصحيحة
  "volkswagon": "volkswagen",
  "volkswagan": "volkswagen",
  "volks": "volkswagen",
  "vw": "volkswagen",
  
  "mitsubishi": "mitsubishi", // القيمة الصحيحة
  "mistubishi": "mitsubishi",
  "mitsubisi": "mitsubishi",
  "mitsubushi": "mitsubishi",
  "mitsibushi": "mitsubishi",
  
  "mazda": "mazda", // القيمة الصحيحة
  "mazada": "mazda",
  "masda": "mazda",
  "maza": "mazda",
  "mazd": "mazda",
  
  "subaru": "subaru", // القيمة الصحيحة
  "suburu": "subaru",
  "sabaru": "subaru",
  "subbaru": "subaru",
  
  "lexus": "lexus", // القيمة الصحيحة
  "laxus": "lexus",
  "lexxus": "lexus",
  "lexuss": "lexus",
  "leksus": "lexus",
  
  "infiniti": "infiniti", // القيمة الصحيحة
  "infinti": "infiniti",
  "infinty": "infiniti",
  "infiniti": "infiniti",
  "infniti": "infiniti",
  
  "acura": "acura", // القيمة الصحيحة
  "accura": "acura",
  "acuura": "acura",
  "acra": "acura",
  
  "porsche": "porsche", // القيمة الصحيحة
  "porsh": "porsche",
  "porshe": "porsche",
  "porche": "porsche",
  "porscha": "porsche",
  
  "audi": "audi", // القيمة الصحيحة
  "auди": "audi",
  "awdi": "audi",
  "aaudi": "audi",
  "audy": "audi",
  
  "bmw": "bmw", // القيمة الصحيحة
  "bmv": "bmw",
  "bwm": "bmw",
  "bmm": "bmw",
  
  "ford": "ford", // القيمة الصحيحة
  "foord": "ford",
  "frod": "ford",
  "ford": "ford",
  "forde": "ford",
  
  "jeep": "jeep", // القيمة الصحيحة
  "jep": "jeep",
  "jeap": "jeep",
  "jeeep": "jeep",
  "jip": "jeep",
  
  "tesla": "tesla", // القيمة الصحيحة
  "teslla": "tesla",
  "tesle": "tesla",
  "teslaa": "tesla",
  "tesala": "tesla",
  
  "kia": "kia", // القيمة الصحيحة
  "kiaa": "kia",
  "kya": "kia",
  "ki": "kia",
  
  // English car model corrections
  "camry": "camry", // القيمة الصحيحة
  "camri": "camry",
  "camery": "camry",
  "camary": "camry",
  
  "corolla": "corolla", // القيمة الصحيحة
  "corola": "corolla",
  "coroola": "corolla",
  "coralla": "corolla",
  "corollaa": "corolla",
  
  "accord": "accord", // القيمة الصحيحة
  "acord": "accord",
  "acordd": "accord",
  "accrd": "accord",
  
  "altima": "altima", // القيمة الصحيحة
  "altma": "altima",
  "altimaa": "altima",
  "atima": "altima",
  
  "civic": "civic", // القيمة الصحيحة
  "civac": "civic",
  "civc": "civic",
  "civick": "civic",
  
  "elantra": "elantra", // القيمة الصحيحة
  "elanta": "elantra",
  "elantar": "elantra",
  "elantara": "elantra",
  
  "sonata": "sonata", // القيمة الصحيحة
  "sonata": "sonata",
  "sonta": "sonata",
  "sonataa": "sonata",
  
  "hilux": "hilux", // القيمة الصحيحة
  "hilix": "hilux",
  "hillux": "hilux",
  "hilus": "hilux",
  "hiluxx": "hilux",
  
  "highlander": "highlander",
  "highlandr": "highlander",
  "higlander": "highlander",
  "highlnder": "highlander",
  
  "هايلندر": "هايلاندر",
  "هاي لاندر": "هايلاندر",
  "هاي لاند": "هايلاندر",
  "هايلاند": "هايلاندر",
  
  // أخطاء في أسماء السيارات
  "كامرى": "كامري",
  "كامر": "كامري",
  "كامرء": "كامري",
  "كمري": "كامري", // إضافة جديدة
  "كامى": "كامري", // إضافة جديدة
  
  "كورولا": "كورولا", // القيمة الصحيحة
  "كوروللا": "كورولا",
  "كورلا": "كورولا",
  "كوررولا": "كورولا",
  "كوريلا": "كورولا",
  "كرولا": "كورولا", // إضافة جديدة
  "كورله": "كورولا", // إضافة جديدة
  
  "اكورد": "أكورد",
  "اكرد": "أكورد",
  "اكورت": "أكورد",
  "أكوردد": "أكورد",
  "اكؤرد": "أكورد",
  
  "التيما": "ألتيما",
  "الطيما": "ألتيما",
  "التايما": "ألتيما",
  "الطايما": "ألتيما",
  "التيمه": "ألتيما",
  
  "اكسنت": "أكسنت",
  "اكسينت": "أكسنت",
  "اكزنت": "أكسنت",
  "أكسيت": "أكسنت",
  "أكسسنت": "أكسنت",
  
  // أخطاء في الألوان
  "احمر": "أحمر",
  "اخضر": "أخضر",
  "ازرق": "أزرق",
  "اصفر": "أصفر",
  "ابيض": "أبيض",
  "اسود": "أسود",
  "رمادى": "رمادي",
  "برتقالى": "برتقالي",
  "فضى": "فضي",
  "بنى": "بني",
  "ذهبى": "ذهبي",
  
  // أخطاء في أنواع الوقود
  "كهربائى": "كهربائي",
  "كهرباى": "كهربائي",
  "كهربائ": "كهربائي",
  "هيبرد": "هجين",
  "هايبرد": "هجين",
  "هجين": "هجين", // القيمة الصحيحة
  
  // أخطاء في أنواع السيارات
  "سيدان": "سيدان", // القيمة الصحيحة
  "سيدآن": "سيدان",
  "سيدان": "سيدان",
  "سادان": "سيدان",
  "سيداان": "سيدان",
  
  "هاتشباك": "هاتشباك", // القيمة الصحيحة
  "هاتش باك": "هاتشباك",
  "هاچباك": "هاتشباك",
  "هاتشبك": "هاتشباك",
  "هتشباك": "هاتشباك",
  
  "دفع رباعى": "دفع رباعي",
  "دفع رباعي": "دفع رباعي", // القيمة الصحيحة
  "دفع رباعى": "دفع رباعي",
  "دفع ربعى": "دفع رباعي",
  "دفع ربعي": "دفع رباعي",
  "دفع 4": "دفع رباعي",
  "4x4": "دفع رباعي",
  "4*4": "دفع رباعي",
  
  // أخطاء في كلمات عامة
  "سياره": "سيارة",
  "سيارة": "سيارة", // القيمة الصحيحة
  "سياارة": "سيارة",
  "سيارات": "سيارات", // القيمة الصحيحة
  "سياارات": "سيارات",
  "سيارااات": "سيارات",
  "سياره": "سيارة",
  "سيارت": "سيارات",
  
  "سعر": "سعر", // القيمة الصحيحة
  "سعار": "سعر",
  "سع": "سعر",
  "سعار": "أسعار",
  "اسعار": "أسعار",
  "أسعارة": "أسعار",
  
  "جديد": "جديد", // القيمة الصحيحة
  "جديدة": "جديدة", // القيمة الصحيحة
  "جديده": "جديدة",
  "جدد": "جديد",
  "جدديد": "جديد",
  
  "مستعمل": "مستعمل", // القيمة الصحيحة
  "مستعمله": "مستعملة",
  "مستعملة": "مستعملة", // القيمة الصحيحة
  "مسستعمل": "مستعمل",
  "مستععمل": "مستعمل",
  
  // أخطاء متنوعة أخرى
  "متوفر": "متوفر", // القيمة الصحيحة
  "متوفره": "متوفرة",
  "متوفرة": "متوفرة", // القيمة الصحيحة
  "متوف": "متوفر",
  "متوافر": "متوفر",
  
  "موديل": "موديل", // القيمة الصحيحة
  "موديل": "موديل",
  "مودييل": "موديل",
  "مووديل": "موديل",
  "مودل": "موديل",

  // فخامة / luxury (تصحيحات شائعة)
  "فارهه": "فاخرة",
  "فارهة": "فاخرة",
  "فاره": "فاخرة",
  "lexury": "luxury",
  "lexuary": "luxury",
  
  "اوتوماتيك": "أوتوماتيك",
  "اوتوماتك": "أوتوماتيك",
  "اوتومتيك": "أوتوماتيك",
  "أوتوماطيك": "أوتوماتيك",
  "اتوماتيك": "أوتوماتيك",
  "اوتو": "أوتوماتيك",
  
  "عادي": "عادي", // القيمة الصحيحة (ناقل حركة يدوي)
  "عاادي": "عادي",
  "عادى": "عادي",
  "عاد": "عادي",
  "مانيوال": "عادي",
  "مانيول": "عادي",
  "يدوي": "عادي",
  "يدوى": "عادي",
  
  "كيلو": "كيلومتر",
  "كيلو متر": "كيلومتر",
  "ك.م": "كيلومتر",
  "كيلوو": "كيلومتر",

  // لهجة سعودية / خليجية → معنى فصيح للفهم والبحث
  "ابغى": "أريد",
  "أبغى": "أريد",
  "ابغي": "أريد",
  "أبغي": "أريد",
  "ابي": "أريد",
  "أبي": "أريد",
  "ابيه": "أريد",
  "أبيه": "أريد",
  "يبغى": "يريد",
  "يبي": "يريد",
  "تبغى": "تريد",
  "تبي": "تريد",
  "ما ابغى": "لا أريد",
  "ما أبي": "لا أريد",
  "ما ابي": "لا أريد",
  "مو ابغى": "لا أريد",
  "مو ببغى": "لا أريد",
  "وش": "ماذا",
  "ايش": "ماذا",
  "ليش": "لماذا",
  "ليه": "لماذا",
  "وين": "أين",
  "هالحين": "الآن",
  "الحين": "الآن",
  "دحين": "الآن",
  "الحين بس": "الآن فقط",
  "عشان": "لأن",
  "علشان": "لأن",
  "وريني": "أرني",
  "ورني": "أرني",
  "شوفلي": "أرني",
  "شوف لي": "أرني",
  "قلي": "أخبرني",
  "قولي": "أخبرني",
  "كم السعر": "ما السعر",
  "بكم": "بكم",
  "قد ايش": "كم",
  "قد إيش": "كم",
  "كذا": "هكذا",
  "جذي": "هكذا",
  "زين": "جيد",
  "تمام": "حسناً",
  "طيب": "حسناً",
  "خلاص": "حسناً",
  "يلا": "هيا",
  "ترا": "اعلم أن",
  "عقب": "بعد",
  "قدام": "أمام",
  "فلوس": "مال",
  "دراهم": "مال",
  "اقساط": "أقساط",
};

// دالة لتصحيح الأخطاء الإملائية والكتابة البديلة
// يستبدل كلمات كاملة فقط — استبدال الجزء الداخلي يفسد الصحيح
// (مثال: مفتاح "كامر" داخل "كامري" كان ينتج "كامريي")
function correctArabicSpelling(text) {
  if (!text || typeof text !== "string") return text;

  let correctedText = text;
  const sortedKeys = Object.keys(arabicSpellingVariations).sort(
    (a, b) => b.length - a.length
  );

  sortedKeys.forEach((incorrect) => {
    const correct = arabicSpellingVariations[incorrect];
    if (!incorrect || incorrect === correct) return;
    if (!correctedText.includes(incorrect)) return;

    const escaped = incorrect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // حدود كلمة: بداية/نهاية أو مسافة (يعمل للعربية والإنجليزية)
    const regex = new RegExp(`(^|\\s)(${escaped})(?=\\s|$)`, "gi");
    correctedText = correctedText.replace(regex, `$1${correct}`);
  });

  return correctedText.replace(/\s+/g, " ").trim();
}

async function searchCarsInDatabase(query, conversationHistory = []) {
  logger.debug("[chatbot] Searching cars", {
    queryLength: query?.length || 0,
    historyLength: conversationHistory.length,
  });
  const correctedQuery = correctArabicSpelling(query);
  return searchCarsForChat(correctedQuery, conversationHistory);
}

async function buildContactActions(store = null) {
  const storeInfo = store || (await fetchStoreInfoForChatbot());
  const mandebsResult = await getPublicMandebs().catch(() => ({ success: false, data: [] }));
  const mandebs = mandebsResult?.success ? mandebsResult.data || [] : [];

  if (!storeInfo?.phone && !storeInfo?.whatsapp && !storeInfo?.email && mandebs.length === 0) {
    return null;
  }

  return {
    phone: storeInfo?.phone || null,
    whatsapp: storeInfo?.whatsapp || null,
    email: storeInfo?.email || null,
    mandebs: mandebs.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      city: m.city,
    })),
  };
}

// Helper function to calculate average price for a car make
async function getAveragePriceByMake(make) {
  try {
    const cars = await db.car.findMany({
      where: {
        make: { contains: make, mode: "insensitive" },
        status: "AVAILABLE"
      },
      select: {
        price: true
      }
    });

    if (cars.length === 0) return null;

    const total = cars.reduce((sum, car) => sum + Number(car.price), 0);
    const average = total / cars.length;

    return {
      average: average.toFixed(2),
      count: cars.length,
      min: Math.min(...cars.map(c => Number(c.price))),
      max: Math.max(...cars.map(c => Number(c.price)))
    };
  } catch (error) {
    console.error("Error calculating average price:", error);
    return null;
  }
}

// Compact car context for faster OpenAI latency (no images/URLs/long blurbs)
function formatCarsForAI(cars) {
  if (cars.length === 0) return "لا توجد سيارات متاحة حالياً تطابق البحث.";

  return cars.slice(0, 8).map((car, index) => {
    const hasPrice = Number(car.price) > 0;
    const price = hasPrice
      ? `${Number(car.price).toLocaleString("ar-SA")} ر.س`
      : "غير محدد — تواصل للإدارة";
    const bits = [
      `${index + 1}) ${car.make} ${car.model} ${car.year}`,
      `سعر: ${price}`,
      car.mileage != null ? `كم: ${Number(car.mileage).toLocaleString("en-US")}` : null,
      car.color ? `لون: ${car.color}` : null,
      car.fuelType ? `وقود: ${car.fuelType}` : null,
      car.transmission ? `ناقل: ${car.transmission}` : null,
      car.bodyType ? `هيكل: ${car.bodyType}` : null,
      car.seats ? `مقاعد: ${car.seats}` : null,
      car.isLuxury ? "فاخرة" : null,
      car.featured ? "مميزة" : null,
    ].filter(Boolean);
    return bits.join(" | ");
  }).join("\n");
}

/**
 * Did the reply actually name this car? Used instead of "the reply mentions the
 * word سيارة" so we never staple unrelated inventory onto an unrelated answer.
 */
function carIsMentionedIn(car, text = "") {
  const haystack = normalizeSearchText(text);
  if (!haystack) return false;

  const model = normalizeSearchText(car?.model);
  const make = normalizeSearchText(car?.make);

  // The model is the distinguishing part; the make alone is too broad.
  if (model && model.length > 1 && haystack.includes(model)) return true;

  return Boolean(
    make &&
      model &&
      haystack.includes(make) &&
      model.split(" ").some((part) => part.length > 2 && haystack.includes(part))
  );
}

/** Reply that admits it cannot help — those must always offer a human. */
function looksLikeDeadEndAnswer(text = "") {
  return /عذرا|عذراً|آسف|اسف|للأسف|للاسف|لا أستطيع|لا استطيع|لا أملك|لا املك|لا تتوفر لدي|لا توجد لدي|لا نوفر|لا نقدم|لست متأكد|لا أعرف|لا اعرف|غير متاح|خارج نطاق/i.test(
    String(text || "")
  );
}

/** Greetings / thanks / short chitchat — not inventory searches. */
function isGreetingOrChitchat(text = "") {
  const t = String(text).trim();
  if (!t) return true;

  if (
    /^(مرحبا|مرحباً|مرحبه|اهلا|أهلا|أهلاً|اهلاً|السلام\s*عليكم|وعليكم\s*السلام|هلا|هلاو|هاي|hello|hi|hey|صباح\s*الخير|مساء\s*الخير|كيفك|كيف\s*حالك|شلونك|شكرا|شكراً|مشكور|thanks|thank\s*you|ok|تمام|حسنا|طيب|اوكي)[\s!.؟]*$/i.test(
      t
    )
  ) {
    return true;
  }

  // Very short messages without clear car/search keywords
  const hasInventoryCue =
    /سيار|تمويل|تقسيط|سعر|عرض|ماركة|موديل|تويوتا|هيونداي|نيسان|كيا|bmw|مرسيدس|لكزس|فاخر|اقتصاد|راتب|قسط|car|toyota|hyundai|nissan|kia/i.test(
      t
    );
  return t.length <= 12 && !hasInventoryCue && !/\d/.test(t);
}

function detectChatIntents(text) {
  const contact =
    /تواصل|أرقام|ارقام|اتصال|اتصل|رقم|جوال|هاتف|تليفون|موبايل|واتساب|واتس|whatsapp|phone|call|contact|numbers?|مندوب|مناديب|موظف|خدمة\s*عملاء|customer\s*service|كيف\s*أتواصل|كيف\s*اتواصل/i.test(
      text
    );
  const corporate =
    /شركات|مؤسسات|عروض الشركات|المؤسسات|جهات|أسطول|fleet|قطاع\s*حكومي/i.test(
      text
    );
  const financing =
    !contact &&
    /تقسيط|تمويل|بنك|بنكي|قرض|قسط|أقساط|فائدة|شروط.*تمويل|loan|finance|installment|تمويلية/i.test(
      text
    );
  const compare =
    /مقارنة|قارن|مقارنه|compare|versus|\bvs\b|ضد\b|بين\s*موديل|الفرق\s*بين|مواصفات|موصفات/i.test(
      text
    );
  const ranking = wantsRankingAmongResults(text);
  const economical =
    /اقتصاد|توفير|وقود|استهلاك|رخيص|cheap|fuel|اقتصادية|أفضل\s*سيارة\s*اقتصاد/i.test(
      text
    );
  const latestOffers =
    !corporate &&
    (/أحدث.*عروض|عروض.*السيارات|أحدث.*متوفرة|المتوفرة حالياً|وصلت\s*حديثا|new arrivals|latest\s*offers/i.test(
      text
    ) ||
      /ابحث عن أحدث عروض|أبحث عن أحدث عروض/i.test(text));
  const greeting = isGreetingOrChitchat(text);

  return {
    contact,
    corporate,
    financing,
    compare,
    ranking,
    economical,
    latestOffers,
    greeting,
  };
}

async function fetchLatestOfferCars() {
  return fetchLatestOfferCarsForChat();
}

async function fetchEconomicalCars(maxPrice = null) {
  return fetchEconomicalCarsForChat(maxPrice);
}

function buildPlatformInfoForAI(storeInfo) {
  const storeDescription = storeInfo?.description?.trim();
  const lines = [
    "- بيع سيارات جديدة متوفرة على الموقع",
    "- التمويل الإسلامي عبر البنوك الشريكة",
    "- حجز تجربة قيادة عبر الموقع",
    "- عروض الشركات والمؤسسات",
    "- **سيارة فاخرة (luxury)** = أي سيارة عليها وسم «فاخرة» في الموقع (isLuxury)",
    "- نوفر سيارات كهربائية وهجينة حسب المخزون المتاح",
    "- دعم العملاء متوفر عبر قنوات التواصل الرسمية",
  ];
  if (storeDescription) {
    lines.unshift(`- نبذة عن المعرض: ${storeDescription}`);
  }
  return lines.join("\n");
}

async function fetchBanksForChatbot() {
  try {
    return await db.bank.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("fetchBanksForChatbot:", e);
    return [];
  }
}

async function fetchStoreInfoForChatbot() {
  try {
    return await db.storeInfo.findFirst();
  } catch (e) {
    console.error("fetchStoreInfoForChatbot:", e);
    return null;
  }
}

function formatBanksForAI(banks) {
  if (!banks?.length) {
    return "لا توجد بنوك مسجلة في الجدول حالياً — وجّه العميل لصفحة البنوك على الموقع أو لطلب التمويل من صفحة السيارة.";
  }
  return banks
    .map((b, i) => {
      const rate = b.interestRate != null ? Number(b.interestRate) : null;
      const rateStr =
        rate != null && !Number.isNaN(rate) ? `${rate}%` : "غير محدد";
      const policy = b.loanPolicy?.trim()
        ? `\n   سياسة التمويل / الشروط: ${b.loanPolicy}`
        : "";
      return `${i + 1}. **${b.name}** — نسبة الفائدة السنوية التقريبية: ${rateStr}${policy}`;
    })
    .join("\n\n");
}

function formatStoreForAI(store) {
  if (!store) return "لا تتوفر بيانات متجر في قاعدة البيانات.";
  const parts = [
    store.name && `اسم المعرض: ${store.name}`,
    store.phone && `هاتف: ${store.phone}`,
    store.whatsapp && `واتساب: ${store.whatsapp}`,
    store.email && `بريد: ${store.email}`,
    [store.address, store.city, store.country].filter(Boolean).join("، ") &&
      `عنوان: ${[store.address, store.city, store.country].filter(Boolean).join("، ")}`,
    store.description && `نبذة: ${store.description}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function getChatbotResponse(message, conversationHistory = [], options = {}) {
  try {
    const {
      sessionId,
      conversationId: incomingConversationId = null,
      action = null,
      actionPayload = {},
    } = options || {};

    if (!sessionId) {
      return { success: false, message: "معرّف الجلسة مفقود. حدّث الصفحة وحاول مرة أخرى." };
    }

    let conversation = incomingConversationId
      ? await getConversationById(incomingConversationId)
      : null;

    if (!conversation || conversation.sessionId !== sessionId) {
      conversation = await ensureChatConversation(sessionId);
    }

    if (action === "select_car" && actionPayload.carId) {
      if (isCompareMode(conversation.mode)) {
        return selectCarForCompare(
          conversation,
          actionPayload.carId,
          message || null
        );
      }
      return selectCarForLoan(conversation, actionPayload.carId, message || null);
    }
    if (action === "select_offer" && actionPayload.offerId != null) {
      return selectOfferForLoan(conversation, actionPayload.offerId, message || null);
    }
    if (action === "start_loan") {
      return startLoanFlow(conversation, {
        cars: actionPayload.cars || [],
        message: message || "أريد تمويل سيارة",
      });
    }

    const wantsCancel =
      (wantsCancelLoanFlow(message) || wantsCancelCompareFlow(message)) &&
      conversation.mode !== LOAN_CHAT_MODES.IDLE;
    if (wantsCancel) {
      const wasCompare = isCompareMode(conversation.mode);
      await updateChatConversationState(conversation.id, {
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      });
      conversation = await getConversationById(conversation.id);
      const cancelReply = {
        success: true,
        message: wasCompare
          ? "تم إلغاء المقارنة. كيف يمكنني مساعدتك؟"
          : "تم إلغاء مسار التمويل. كيف يمكنني مساعدتك؟",
        cars: [],
        offers: [],
        conversationId: conversation.id,
        mode: LOAN_CHAT_MODES.IDLE,
      };
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        { role: "assistant", content: cancelReply.message, payload: {} },
      ]);
      return cancelReply;
    }

    const activeLoanModes = [
      LOAN_CHAT_MODES.LOAN_INTAKE,
      LOAN_CHAT_MODES.OFFERS,
      LOAN_CHAT_MODES.CONTACT_INTAKE,
      LOAN_CHAT_MODES.ADMIN_CONTACT,
    ];
    if (activeLoanModes.includes(conversation.mode)) {
      const loanReply = await handleLoanChatTurn(conversation, message);
      if (loanReply) return loanReply;
    }

    if (conversation.mode === LOAN_CHAT_MODES.SUBMITTED) {
      await updateChatConversationState(conversation.id, {
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      });
      conversation = await getConversationById(conversation.id);
    }

    logger.debug("[chatbot] Received message", {
      messageLength: message?.length || 0,
      historyLength: conversationHistory.length,
      conversationId: conversation.id,
      mode: conversation.mode,
    });
    
    // تصحيح الأخطاء الإملائية في رسالة المستخدم
    const correctedMessage = correctArabicSpelling(message);
    const shouldShowCorrection = correctedMessage !== message;
    logger.debug("[chatbot] Spell check result", { corrected: shouldShowCorrection });

    const earlyIntents = detectChatIntents(correctedMessage);
    const salaryIntentEarly = wantsSalaryRecommendation(correctedMessage);
    const installmentBudgetEarly = wantsInstallmentBudget(correctedMessage);
    const affordabilityEarly = parseAffordabilityFromText(correctedMessage);
    const maxInstallmentEarly = parseMaxInstallmentFromText(correctedMessage);

    // Leave financing car-select for free chat — but KEEP compare mode active
    if (conversation.mode === LOAN_CHAT_MODES.CAR_SELECT) {
      await updateChatConversationState(conversation.id, {
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      });
      conversation = await getConversationById(conversation.id);
    }

    // Contact shortcut (also exits compare if needed)
    if (earlyIntents.contact) {
      if (isCompareMode(conversation.mode)) {
        await updateChatConversationState(conversation.id, {
          mode: LOAN_CHAT_MODES.IDLE,
          loanState: emptyLoanState(),
        });
        conversation = await getConversationById(conversation.id);
      }
      const storeInfoEarly = await fetchStoreInfoForChatbot();
      const contactActionsEarly = await buildContactActions(storeInfoEarly);
      const contactMessage = earlyIntents.corporate
        ? "يسعدنا اهتمامكم بعروض الشركات والمؤسسات! 🏢 نوفر أسطولاً متنوعاً وأسعاراً خاصة للجهات. تواصلوا معنا عبر الأزرار أدناه لنعد لكم عرضاً مخصصاً."
        : "يسعدنا تواصلك معنا! 😊 اسألني أي شيء عن السيارات أو التمويل، أو تواصل مباشرة عبر الأزرار أدناه.";
      const contactReply = {
        success: true,
        message: contactMessage,
        cars: [],
        offers: [],
        contactActions: contactActionsEarly,
        conversationId: conversation.id,
        mode: conversation.mode,
      };
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        {
          role: "assistant",
          content: contactReply.message,
          payload: { contactActions: contactActionsEarly },
        },
      ]);
      return contactReply;
    }

    // Change first/second car after a finished comparison
    if (parseChangeCompareSlot(correctedMessage)) {
      const changeReply = await handleChangeCompareRequest(
        conversation,
        correctedMessage
      );
      if (changeReply) return changeReply;
    }

    // One-shot: "قارن لكزس وكامري" → table immediately
    if (parseCompareEntities(correctedMessage)) {
      const oneShot = await tryOneShotCompare(conversation, correctedMessage);
      if (oneShot) return oneShot;
    }

    // Start compare wizard when user wants to compare but didn't name both cars
    if (
      wantsCompareFlow(correctedMessage) &&
      conversation.mode === LOAN_CHAT_MODES.IDLE &&
      !salaryIntentEarly &&
      !installmentBudgetEarly
    ) {
      return startCompareFlow(conversation, { message: correctedMessage });
    }

    // Active compare: treat the message as car 1 / car 2 search
    if (isCompareMode(conversation.mode)) {
      if (salaryIntentEarly || installmentBudgetEarly) {
        await updateChatConversationState(conversation.id, {
          mode: LOAN_CHAT_MODES.IDLE,
          loanState: emptyLoanState(),
        });
        conversation = await getConversationById(conversation.id);
      } else {
        const matchedCars = await searchCarsInDatabase(correctedMessage, []);
        return handleCompareCarSearch(
          conversation,
          matchedCars.slice(0, 8),
          message
        );
      }
    }

    // Build conversation history context first to understand context
    let previousCarsContext = "";
    let previousCars = [];
    let conversationText = "";
    if (conversationHistory.length > 0) {
      conversationText = "\n\nسياق المحادثة السابقة:\n";
      // Keep history short for faster OpenAI latency
      conversationHistory.slice(-4).forEach((msg) => {
        const short = String(msg.text || "").slice(0, 280);
        conversationText += `${msg.sender === "user" ? "العميل" : "المساعد"}: ${short}\n`;
      });

      // Get cars from the last bot response for context
      const lastBotMessage = [...conversationHistory]
        .reverse()
        .find((msg) => msg.sender === "bot");
      if (lastBotMessage && lastBotMessage.cars && lastBotMessage.cars.length > 0) {
        previousCars = lastBotMessage.cars;
        previousCarsContext = `\n\nالسيارات المعروضة في الرد السابق:\n${formatCarsForAI(lastBotMessage.cars.slice(0, 6))}`;
        logger.debug("[chatbot] Using cars from previous context", {
          count: lastBotMessage.cars.length,
        });
      }
    }

    const intents = detectChatIntents(correctedMessage);
    logger.debug("[chatbot] Detected intents", intents);

    const budget = parseBudgetFromQuery(correctedMessage);
    const storeInfo = await fetchStoreInfoForChatbot();
    let contactActions = null;
    let salaryContext = "";
    let relevantCars = [];
    const salaryIntent = salaryIntentEarly;
    const affordability = affordabilityEarly;
    const maxInstallment = maxInstallmentEarly;
    const installmentIntent = installmentBudgetEarly;

    try {
      if (salaryIntent && affordability.netSalary) {
        const banksForFilter = await fetchBanksForChatbot();
        const allCars = await fetchAllAvailableCarsForChat(50);
        relevantCars = await filterCarsByAffordability(
          allCars,
          banksForFilter,
          affordability.netSalary,
          affordability.totalMonthlyObligations
        );
        const maxPayment = getMaxAffordableMonthlyPayment(
          affordability.netSalary,
          affordability.totalMonthlyObligations
        );
        salaryContext = `\n\n=== ترشيح حسب الراتب (DTI ${35}%) ===
- صافي الراتب: ${Number(affordability.netSalary).toLocaleString("ar-SA")} ر.س
- الالتزامات الشهرية: ${Number(affordability.totalMonthlyObligations).toLocaleString("ar-SA")} ر.س
- أقصى قسط شهري مقبول تقريباً: ${maxPayment.toLocaleString("ar-SA")} ر.س
- السيارات أدناه مُصفّاة بناءً على عروض تمويل فعلية (افتراضات تقديرية)`;
        logger.debug("[chatbot] Salary-based filtering applied", {
          count: relevantCars.length,
        });
      } else if (installmentIntent && maxInstallment) {
        const banksForFilter = await fetchBanksForChatbot();
        const allCars = await fetchAllAvailableCarsForChat(50);
        relevantCars = await filterCarsByMaxInstallment(
          allCars,
          banksForFilter,
          maxInstallment
        );
        salaryContext = `\n\n=== فلترة حسب أقصى قسط شهري ===
- أقصى قسط شهري مطلوب: ${Number(maxInstallment).toLocaleString("ar-SA")} ر.س`;
        logger.debug("[chatbot] Max-installment filtering applied", {
          count: relevantCars.length,
          maxInstallment,
        });
      } else if (intents.ranking && previousCars.length > 0) {
        relevantCars = previousCars;
        logger.debug("[chatbot] Ranking among previously shown cars", {
          count: relevantCars.length,
        });
      } else if (intents.economical) {
        relevantCars = await fetchEconomicalCars(budget.maxPrice);
        logger.debug("[chatbot] Using economical car set");
      } else if (intents.latestOffers) {
        relevantCars = await fetchLatestOfferCars();
        if (budget.maxPrice != null) {
          relevantCars = relevantCars.filter(
            (car) => Number(car.price) <= budget.maxPrice
          );
        }
        logger.debug("[chatbot] Using latest offers car set");
      } else if (!intents.greeting) {
        logger.debug("[chatbot] Searching database with conversation context");
        relevantCars = await searchCarsInDatabase(
          correctedMessage,
          conversationHistory
        );
      }
    } catch (filterError) {
      logger.error("[chatbot] Car filtering failed", filterError);
      relevantCars = [];
    }

    if (intents.corporate && relevantCars.length === 0) {
      relevantCars = await fetchLatestOfferCars();
      logger.debug("[chatbot] Added sample cars for corporate context");
    }

    const needsContactFallback =
      relevantCars.length === 0 &&
      !salaryIntent &&
      !installmentIntent &&
      !intents.greeting &&
      !intents.ranking &&
      !intents.financing &&
      !intents.compare;

    // Contacts only for corporate / real dead-end — never on compare Q&A
    if (needsContactFallback || intents.corporate) {
      contactActions = await buildContactActions(storeInfo);
    }

    logger.debug("[chatbot] Relevant cars resolved", { count: relevantCars.length });

    // Always provide store; banks only when financing/salary/installment (keeps prompts smaller/faster)
    const banks =
      intents.financing || salaryIntent || installmentIntent
        ? await fetchBanksForChatbot()
        : [];
    const banksContext =
      banks.length > 0
        ? `\n\n=== بيانات البنوك والتمويل ===\n${formatBanksForAI(banks)}`
        : "";
    const storeContactContext = `\n\n=== بيانات التواصل الرسمية للمعرض ===\n${formatStoreForAI(storeInfo)}`;

    let intentInstructions = `
أسلوب: محادثة حرة سريعة وطبيعية باللهجة السعودية المفهومة.
- افهم اللهجة السعودية/الخليجية مباشرة (ابغى=أريد، أبي=أريد، وش/ايش=ماذا، ليش=لماذا، وين=أين، الحين=الآن، وريني=أرني، عشان=لأن، بكم=كم السعر).
- لا تطلب من العميل الفصحى؛ افهم قصده ولو كتب عامية أو بأخطاء.
- أجب مباشرة باختصار (٣–٦ أسطر غالباً)، سؤال توضيحي واحد فقط عند الحاجة.
`;
    if (intents.greeting) {
      intentInstructions += `
موضوع الرسالة: **تحية**.
- رحّب باختصار وقدّم نفسك، واسأل كيف تساعد دون سرد قائمة طويلة.
`;
    }
    if (budget.maxPrice != null || budget.minPrice != null) {
      intentInstructions += `
موضوع الرسالة: **ميزانية**.
${budget.maxPrice != null ? `- الحد الأقصى: ${budget.maxPrice.toLocaleString("ar-SA")} ر.س` : ""}
${budget.minPrice != null ? `- الحد الأدنى: ${budget.minPrice.toLocaleString("ar-SA")} ر.س` : ""}
`;
    }
    if (salaryIntent && !affordability.netSalary && !maxInstallment) {
      intentInstructions += `
موضوع الرسالة: **راتب بدون رقم** — اطلب بلطف صافي الراتب والالتزامات في جملة قصيرة طبيعية.
`;
    }
    if (salaryIntent && affordability.netSalary) {
      intentInstructions += `
موضوع الرسالة: **ترشيح حسب الراتب** — رشّح من القائمة المؤهلة واذكر أن التقدير أولي.
`;
    }
    if (installmentIntent && maxInstallment) {
      intentInstructions += `
موضوع الرسالة: **حد قسط ${Number(maxInstallment).toLocaleString("ar-SA")} ر.س** — رشّح من القائمة.
`;
    }
    if (intents.ranking) {
      intentInstructions += `
موضوع الرسالة: **أيهم أفضل** — توصية واضحة مع سبب قصير.
`;
    }
    if (intents.compare && !intents.ranking) {
      intentInstructions += `
موضوع الرسالة: **مقارنة** — قارن نصياً (سعر، سنة، هيكل، وقود، مقاعد).
`;
    }
    if (intents.economical) {
      intentInstructions += `
موضوع الرسالة: **اقتصادية**.
`;
    }
    if (intents.latestOffers) {
      intentInstructions += `
موضوع الرسالة: **أحدث العروض**.
`;
    }
    if (intents.financing) {
      intentInstructions += `
موضوع الرسالة: **تمويل / تقسيط**.
- اشرح من بيانات البنوك. لا تبدأ استبياناً — إن أراد طلباً قل له يضغط «موّل هذه السيارة» على البطاقة.
`;
    }
    if (intents.corporate) {
      intentInstructions += `
موضوع الرسالة: **شركات** — وجّه لقنوات التواصل الرسمية.
`;
    }
    if (needsContactFallback) {
      intentInstructions += `
لا توجد سيارات مطابقة — أجب بصدق واقترح بدائل أو تواصل دون اختراع بيانات.
`;
    }
    intentInstructions += `
إذا لم تكن تعرف الإجابة أو كان الطلب خارج نطاق خدماتنا:
- اعتذر بجملة واحدة قصيرة، ثم **ادعُ العميل صراحةً للتواصل مع فريقنا عبر الأزرار أدناه** ليجيبه موظف مختص.
- لا تنهِ الرد باعتذار فقط ودون أي طريقة للتواصل.
`;
    // Always go through OpenAI for free conversation (even with zero cars)
    // Format car data for the AI
    const carsContext = formatCarsForAI(relevantCars);
    logger.debug("[chatbot] Formatted cars context for AI");

    // Enhanced price query detection and handling
    let priceContext = "";
    let isPriceQuery = false;

    // Detect various price-related queries
    const priceQueryPatterns = [
      /(سعر|اسعار|أسعار|price|prices|cost|costs)/i,
      /(كم.*سعر|how much|what.*price)/i,
      /(بكم|for how much|at what price)/i,
      /(سعر.*سيار|car.*price)/i
    ];

    isPriceQuery = priceQueryPatterns.some(pattern => pattern.test(correctedMessage));

    if (isPriceQuery && relevantCars.length > 0) {
      // For price queries, show detailed car information with descriptions
      priceContext = `\n\nمعلومات السيارات المتوفرة مع الأسعار:\n${formatCarsForAI(relevantCars)}`;

      // If user asks for average prices specifically, also include statistics
      const averagePriceMatch = correctedMessage.match(/(متوسط|معدل|average).*(سعر|price)/i);
      if (averagePriceMatch) {
        const make = relevantCars[0].make;
        const priceStats = await getAveragePriceByMake(make);

        if (priceStats) {
          priceContext += `\n\nإحصائيات الأسعار لسيارات ${make}:
- متوسط السعر: ${Number(priceStats.average).toLocaleString("ar-SA")} ر.س
- عدد السيارات المتوفرة: ${priceStats.count}
- أقل سعر: ${priceStats.min.toLocaleString("ar-SA")} ر.س
- أعلى سعر: ${priceStats.max.toLocaleString("ar-SA")} ر.س`;
        }
      }
    } else if (relevantCars.length > 0) {
      // For non-price queries, use the original format
      priceContext = `\n\nالسيارات المتوفرة حالياً في قاعدة البيانات (نتائج البحث الحالية):\n${formatCarsForAI(relevantCars)}`;
    }

    // Create a free-conversation prompt with dealership context
    const systemContext = `أنت مساعد سريع لماكس موتورز (معرض سيارات سعودي).
${intentInstructions}
معلومات المنصة:
${buildPlatformInfoForAI(storeInfo)}

افهم اللهجة السعودية جيداً: ابغى/أبي = أريد، يبغى = يريد، وش/ايش = ماذا، ليش = لماذا، وين = أين، الحين = الآن، وريني = أرني، عشان = لأن، زين/تمام = جيد، مو = ليس، ما أبي = لا أريد.

قواعد الرد:
- عربية بسيطة قريبة من اللهجة السعودية، واضحة ومختصرة
- أجب على السؤال أولاً ثم اقترح خطوة قصيرة إن لزم
- لا تخترع سيارات أو أسعار أو أرقام تواصل
- لا تعرض روابط/URLs
- استخدم **النص** للأسماء والأسعار المهمة
- عند ذكر سيارات من القائمة أضف في النهاية: [CARS_TO_SHOW]1,3
- لا تضف [CARS_TO_SHOW] إن لم تذكر سيارات
- أسماء الماركات/الموديلات تطابق القائمة حرفياً
${banksContext}${storeContactContext}${salaryContext}
${previousCarsContext}

السيارات ذات الصلة:
${carsContext || "لا توجد نتائج مطابقة حالياً."}
${priceContext}`;
    const userPrompt = `${conversationText}\n\nرسالة العميل: ${correctedMessage}${shouldShowCorrection ? ` (تصحيح من: ${message})` : ""}`;

    // Generate response with limited retries for speed
    logger.debug("[chatbot] Sending prompt to OpenAI");

    let text = "";
    let lastError;
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        text = await generateOpenAIText({
          system: systemContext,
          user: userPrompt,
          temperature: 0.35,
          maxTokens: 450,
        });
        logger.debug("[chatbot] AI response received", { responseLength: text.length });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        logger.error("[chatbot] OpenAI error", {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          message: error.message,
          status: error.status,
        });

        // 503 = overloaded, 429 = rate limited. Both are transient when
        // it is the per-minute bucket; a hard quota will still fall through
        // to the contact-actions reply below.
        const status = error.status ?? error?.response?.status;
        const isOverloaded =
          status === 503 ||
          error.message?.includes("503") ||
          error.message?.includes("Service Unavailable");
        const isRateLimited =
          status === 429 ||
          error.message?.includes("429") ||
          /Too Many Requests|rate.?limit|quota/i.test(error.message || "");

        if (isOverloaded || isRateLimited) {
          if (attempt < maxRetries) {
            const delayMs = 600;
            logger.info("[chatbot] Model unavailable, retrying", {
              reason: isRateLimited ? "rate-limit" : "overloaded",
              delayMs,
              nextAttempt: attempt + 2,
              maxAttempts: maxRetries + 1,
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
          logger.warn("[chatbot] Max retries reached", {
            reason: isRateLimited ? "rate-limit" : "overloaded",
          });
        } else {
          throw error;
        }
      }
    }

    // If we get here without a successful result, throw the last error
    if (!text) {
      throw lastError || new Error("Empty OpenAI response");
    }

    // Parse the response to extract which cars to show
    let cleanedText = text.trim();
    // Don't dump full inventory unless the model picks cars (or salary/installment results)
    const forceShowFiltered =
      (salaryIntent && affordability.netSalary) ||
      (installmentIntent && maxInstallment);
    let carsToShow = intents.greeting
      ? []
      : forceShowFiltered
        ? relevantCars.slice(0, 8)
        : [];
    
    // Check if AI specified which cars to show
    const carsMarkerMatch = cleanedText.match(/\[CARS_TO_SHOW\]([\d,\s]+)/);
    if (carsMarkerMatch) {
      const carIndices = carsMarkerMatch[1]
        .split(',')
        .map(num => parseInt(num.trim()) - 1) // Convert to 0-based index
        .filter(index => index >= 0 && index < relevantCars.length);
      
      if (carIndices.length > 0) {
        carsToShow = carIndices.map(index => relevantCars[index]);
        logger.debug("[chatbot] AI selected specific cars to display", {
          count: carsToShow.length,
        });
      }
      
      // Remove the marker from the displayed text
      cleanedText = cleanedText.replace(/\[CARS_TO_SHOW\][\d,\s]+/, '').trim();
    } else if (!forceShowFiltered && !intents.greeting && relevantCars.length > 0) {
      // Model may have talked about cars and forgotten the marker. The old test
      // was "does the reply contain the word سيارة" — true of almost every
      // reply, which is how unrelated, unpriced cars ended up bolted onto an
      // answer about spare parts. Only attach cars the reply actually names.
      carsToShow = relevantCars
        .filter((car) => carIsMentionedIn(car, cleanedText))
        .slice(0, 6);
    }

    // An answer that says "we can't help with that" must not arrive carrying
    // car cards it never mentioned — and it must always offer a human instead.
    if (looksLikeDeadEndAnswer(cleanedText)) {
      const mentioned = carsToShow.filter((car) => carIsMentionedIn(car, cleanedText));
      if (mentioned.length !== carsToShow.length) {
        logger.debug("[chatbot] Dropped unmentioned cars from dead-end answer", {
          dropped: carsToShow.length - mentioned.length,
        });
        carsToShow = mentioned;
      }
      if (!contactActions) {
        contactActions = await buildContactActions(storeInfo);
        logger.debug("[chatbot] Attached contact actions to dead-end answer");
      }
    }
    // Save chat log to database for analytics + full conversation history
    try {
      const clerkUserId = await resolveClerkUserId();
      await db.chatLog.create({
        data: {
          userId: clerkUserId,
          sessionId,
          userMessage: message,
          correctedMessage: shouldShowCorrection ? correctedMessage : null,
          aiResponse: cleanedText,
          carsFound: relevantCars.length,
          carsShown: carsToShow.length,
          carIds: carsToShow.map(car => car.id),
          language: /[\u0600-\u06FF]/.test(message) ? "ar" : "en",
        }
      });
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        {
          role: "assistant",
          content: cleanedText,
          payload: { cars: carsToShow, contactActions },
        },
      ]);
      logger.debug("[chatbot] Chat log + conversation saved");
    } catch (logError) {
      logger.error("[chatbot] Failed to save chat log", logError);
      // Don't throw error - logging failure shouldn't break the chat
    }

    return {
      success: true,
      message: cleanedText,
      carsFound: relevantCars.length,
      cars: carsToShow,
      offers: [],
      contactActions,
      conversationId: conversation.id,
      mode: conversation.mode,
    };
  } catch (error) {
    console.error("Error generating chatbot response:", error);

    const contactActions = await buildContactActions().catch(() => null);
    return {
      success: false,
      message:
        "عذراً، واجهت مشكلة في الاتصال. يمكنك التواصل مع فريق الدعم مباشرة عبر الأزرار أدناه.",
      contactActions,
      error: error.message,
    };
  }
}

// Function to generate car recommendations based on user preferences
export async function getCarRecommendations(preferences) {
  try {
    // First, get available cars from the database
    const availableCars = await db.car.findMany({
      where: {
        status: "AVAILABLE"
      },
      take: 10, // Get more cars for better recommendations
      orderBy: [
        { featured: "desc" },
        { createdAt: "desc" }
      ]
    });

    // Format available cars for the AI
    const carsData = availableCars.map(car => ({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      price: Number(car.price),
      bodyType: car.bodyType,
      fuelType: car.fuelType,
      transmission: car.transmission,
      description: car.description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cars/${car.id}`
    }));

    const prompt = `بناءً على تفضيلات العميل التالية وقائمة السيارات المتوفرة لدينا، اقترح أفضل 3 سيارات مناسبة:

التفضيلات: ${preferences}

السيارات المتوفرة:
${JSON.stringify(carsData, null, 2)}

قدم توصياتك بتنسيق واضح يتضمن:
1. اسم السيارة والموديل
2. السعر
3. لماذا هذه السيارة مناسبة للعميل
4. رابط السيارة

استخدم اللغة العربية وكن واضحاً ومختصراً.`;

    const text = await generateOpenAIText({
      system: "أنت مستشار سيارات في ماكس موتورز. أجب بالعربية باختصار ووضوح.",
      user: prompt,
    });

    return {
      success: true,
      recommendations: text.trim(),
      availableCars: carsData.slice(0, 3), // Include top 3 cars in response
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return {
      success: false,
      message: "عذراً، لم أستطع إنشاء التوصيات في الوقت الحالي.",
    };
  }
}
