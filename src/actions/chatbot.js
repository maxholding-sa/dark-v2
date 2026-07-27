"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serializedCarsData } from "@/lib/helper";
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
  showCarsForLoanSelection,
} from "@/actions/chat-loan";
import {
  LOAN_CHAT_MODES,
  emptyLoanState,
  wantsFinancingFlow,
  wantsCancelLoanFlow,
} from "@/lib/chat-loan-intake";
import {
  searchCarsForChat,
  fetchEconomicalCarsForChat,
  fetchLatestOfferCarsForChat,
  fetchAllAvailableCarsForChat,
} from "@/lib/chat-car-search";
import {
  filterCarsByAffordability,
  parseAffordabilityFromText,
  wantsSalaryRecommendation,
  getMaxAffordableMonthlyPayment,
} from "@/lib/chat-affordability";
import { parseBudgetFromQuery } from "@/lib/car-search";
import { getPublicMandebs } from "@/actions/mandeb";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// قاموس للكتابات البديلة والأخطاء الإملائية الشائعة في اللغة العربية
const arabicSpellingVariations = {
  // أخطاء شائعة في كلمات السيارات
  "هايلوكس": "هايلكس",
  "هايلوكز": "هايلكس", 
  "هيلكس": "هايلكس",
  "هيلوكس": "هايلكس",
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
  "كم": "كيلومتر",
  "ك.م": "كيلومتر",
  "كيلوو": "كيلومتر",
  
  // إضافة المزيد من التصحيحات حسب الحاجة
};

// دالة لتصحيح الأخطاء الإملائية والكتابة البديلة
function correctArabicSpelling(text) {
  if (!text || typeof text !== 'string') return text;
  
  let correctedText = text;
  
  // ترتيب المفاتيح من الأطول إلى الأقصر لتجنب التداخل
  const sortedKeys = Object.keys(arabicSpellingVariations).sort((a, b) => b.length - a.length);
  
  sortedKeys.forEach(incorrect => {
    const correct = arabicSpellingVariations[incorrect];
    
    // إذا كانت الكلمة موجودة في النص، استبدلها
    // استخدام regex للكلمات الإنجليزية للتأكد من التطابق الكامل
    if (correctedText.includes(incorrect)) {
      // للكلمات الإنجليزية، استخدم word boundaries
      if (/^[a-zA-Z]+$/.test(incorrect)) {
        // كلمة إنجليزية - استخدم word boundaries
        const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
        correctedText = correctedText.replace(regex, correct);
      } else {
        // كلمة عربية - استخدم الطريقة البسيطة
        correctedText = correctedText.split(incorrect).join(correct);
      }
    }
  });
  
  // تنظيف المسافات الزائدة
  correctedText = correctedText.replace(/\s+/g, ' ').trim();
  
  return correctedText;
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

  if (!storeInfo?.phone && !storeInfo?.whatsapp && mandebs.length === 0) {
    return null;
  }

  return {
    phone: storeInfo?.phone || null,
    whatsapp: storeInfo?.whatsapp || null,
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

// Helper function to format car data for AI context
function formatCarsForAI(cars) {
  if (cars.length === 0) return "لا توجد سيارات متاحة حالياً تطابق البحث.";

  return cars.map((car, index) => {
    const carUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cars/${car.id}`;
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : null;
    
    return `
سيارة ${index + 1}:
العلامة التجارية: ${car.make}
الموديل: ${car.model}
سنة الصنع: ${car.year}
السعر: ${Number(car.price).toLocaleString("ar-SA")} ر.س
المسافة المقطوعة: ${car.mileage.toLocaleString()} كم
اللون: ${car.color}
نوع الوقود: ${car.fuelType}
ناقل الحركة: ${car.transmission}
نوع الهيكل: ${car.bodyType}
عدد المقاعد: ${car.seats || 'غير محدد'}
الوصف: ${car.description}
رابط السيارة: ${carUrl}
${mainImage ? `الصورة الرئيسية: ${mainImage}` : ''}
${car.featured ? 'تصنيف: ⭐ سيارة مميزة' : ''}
${car.isLuxury ? 'تصنيف: سيارة فاخرة — وسم «فاخرة» (isLuxury)' : ''}`;
  }).join('\n\n');
}

function detectChatIntents(text) {
  const contact =
    /تواصل|اتصال|اتصل|رقم|جوال|هاتف|واتساب|واتس|whatsapp|phone|call|مندوب|مناديب|موظف|خدمة\s*عملاء|customer\s*service/i.test(
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
    /مقارنة|قارن|مقارنه|compare|versus|\bvs\b|ضد\b|بين\s*موديل/i.test(text);
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

  return { contact, corporate, financing, compare, economical, latestOffers };
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

    if (wantsCancelLoanFlow(message) && conversation.mode !== LOAN_CHAT_MODES.IDLE) {
      await updateChatConversationState(conversation.id, {
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      });
      conversation = await getConversationById(conversation.id);
      const cancelReply = {
        success: true,
        message: "تم إلغاء مسار التمويل. كيف يمكنني مساعدتك؟",
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

    // Financing: ask for car first, then show matching cars for selection
    if (
      wantsFinancingFlow(correctedMessage) &&
      conversation.mode === LOAN_CHAT_MODES.IDLE
    ) {
      return startLoanFlow(conversation, { cars: [], message });
    }

    // While choosing a car for financing, search what the customer asked for
    if (conversation.mode === LOAN_CHAT_MODES.CAR_SELECT) {
      const matchedCars = await searchCarsInDatabase(
        correctedMessage,
        conversationHistory
      );
      return showCarsForLoanSelection(
        conversation,
        matchedCars.slice(0, 8),
        message
      );
    }

    // Initialize the model - using gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build conversation history context first to understand context
    let previousCarsContext = "";
    let conversationText = "";
    if (conversationHistory.length > 0) {
      conversationText = "\n\nسياق المحادثة السابقة:\n";
      conversationHistory.slice(-6).forEach((msg) => {
        // Only keep last 6 messages for context
        conversationText += `${msg.sender === "user" ? "العميل" : "المساعد"}: ${msg.text}\n`;
      });
      
      // Get cars from the last bot response for context
      const lastBotMessage = [...conversationHistory].reverse().find(msg => msg.sender === "bot");
      if (lastBotMessage && lastBotMessage.cars && lastBotMessage.cars.length > 0) {
        previousCarsContext = `\n\nالسيارات المعروضة في الرد السابق:\n${formatCarsForAI(lastBotMessage.cars)}`;
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

    if (intents.contact) {
      contactActions = await buildContactActions(storeInfo);
      const contactReply = {
        success: true,
        message:
          "يسعدنا تواصلك معنا! يمكنك الاتصال أو مراسلتنا عبر واتساب مباشرة من الأزرار أدناه، أو اختيار أحد مناديب المبيعات.",
        cars: [],
        offers: [],
        contactActions,
        conversationId: conversation.id,
        mode: conversation.mode,
      };
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        {
          role: "assistant",
          content: contactReply.message,
          payload: { contactActions },
        },
      ]);
      return contactReply;
    }

    let relevantCars = [];
    const salaryIntent = wantsSalaryRecommendation(correctedMessage);
    const affordability = parseAffordabilityFromText(correctedMessage);

    if (salaryIntent && !affordability.netSalary) {
      const salaryPrompt = {
        success: true,
        message:
          "يسعدني أرشّح لك سيارة مناسبة لراتبك! 📊\nأرسل لي:\n- صافي راتبك الشهري بالريال\n- مجموع التزاماتك الشهرية (اكتب 0 إن لم يوجد)\n\nمثال: راتبي 7000 والتزاماتي 1000",
        cars: [],
        offers: [],
        conversationId: conversation.id,
        mode: conversation.mode,
      };
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        { role: "assistant", content: salaryPrompt.message, payload: {} },
      ]);
      return salaryPrompt;
    }

    if (salaryIntent && affordability.netSalary) {
      const banks = await fetchBanksForChatbot();
      const allCars = await fetchAllAvailableCarsForChat(50);
      relevantCars = await filterCarsByAffordability(
        allCars,
        banks,
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
- السيارات أدناه مُصفّاة بناءً على عروض تمويل فعلية (افتراضات: قطاع حكومي مدني، بدون دفعة أولى)
- إذا أراد العميل دقة أعلى، وجّهه لإكمال بيانات التمويل داخل المحادثة`;
      logger.debug("[chatbot] Salary-based filtering applied", {
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
    } else {
      logger.debug("[chatbot] Searching database with conversation context");
      relevantCars = await searchCarsInDatabase(
        correctedMessage,
        conversationHistory
      );
    }

    if (intents.compare && relevantCars.length < 2) {
      const sample = await fetchLatestOfferCars();
      if (sample.length >= 2) {
        relevantCars = sample;
        logger.debug("[chatbot] Compare intent using latest cars");
      }
    }

    if (intents.corporate && relevantCars.length === 0) {
      relevantCars = await fetchLatestOfferCars();
      logger.debug("[chatbot] Added sample cars for corporate context");
    }

    const needsContactFallback = relevantCars.length === 0 && !salaryIntent;
    if (needsContactFallback) {
      contactActions = await buildContactActions(storeInfo);
    }

    logger.debug("[chatbot] Relevant cars resolved", { count: relevantCars.length });

    const banks = intents.financing ? await fetchBanksForChatbot() : [];

    const banksContext = intents.financing
      ? `\n\n=== بيانات البنوك والتمويل (من جدول البنوك في لوحة التحكم) ===\n${formatBanksForAI(banks)}`
      : "";

    const storeContactContext =
      intents.financing || intents.corporate
        ? `\n\n=== بيانات التواصل الرسمية للمعرض (من إعدادات المتجر) ===\n${formatStoreForAI(storeInfo)}`
        : "";

    let intentInstructions = "";
    if (budget.maxPrice != null || budget.minPrice != null) {
      intentInstructions += `
موضوع الرسالة: **فلترة حسب الميزانية**.
- النتائج مُصفّاة مسبقاً حسب الميزانية المطلوبة — لا تذكر سيارات خارج هذا النطاق.
${budget.maxPrice != null ? `- الحد الأقصى للسعر: ${budget.maxPrice.toLocaleString("ar-SA")} ر.س` : ""}
${budget.minPrice != null ? `- الحد الأدنى للسعر: ${budget.minPrice.toLocaleString("ar-SA")} ر.س` : ""}
`;
    }
    if (salaryIntent && affordability.netSalary) {
      intentInstructions += `
موضوع الرسالة: **ترشيح حسب الراتب والالتزامات**.
- اعرض فقط السيارات المؤهلة ضمن حد التحمل الشهري (35% من الدخل المتاح بعد الالتزامات).
- وضّح أن التقدير مبني على افتراضات تمويل أولية ويمكن تحسينه بإكمال بيانات التمويل.
`;
    }
    if (intents.compare) {
      intentInstructions += `
موضوع الرسالة: **مقارنة بين موديلات**.
- اسأل العميل بلطف عن **موديلين أو أكثر** يريد مقارنتها بالاسم (مثلاً: كامري مقابل ألتيما)، أو قارِن بين سيارتين **من القائمة أدناه** إذا وُجد أكثر من خيار.
- قدّم مقارنة منظمة (سعر، سنة، وقود، ناقل حركة، هيكل، تمييز) باستخدام **نفس أسماء الماركة والموديل كما في القاعدة**.
- لا تخترع سيارات غير موجودة في القائمة أو في سياق المحادثة السابقة.
`;
    }
    if (intents.economical) {
      intentInstructions += `
موضوع الرسالة: **أفضل اقتصادية في السعر والوقود**.
- ركّز على **أقل الأسعار** وأنواع الوقود **المنطقية للتوفير** (هجين، بنزين، إلخ) حسب بيانات القائمة فقط.
`;
    }
    if (intents.latestOffers) {
      intentInstructions += `
موضوع الرسالة: **أحدث العروض والسيارات المتوفرة حالياً**.
- قدّم السيارات كأحدث إضافات أو عروض مميزة حسب ترتيب القائمة (⭐ مميزة ثم الأحدث وصولاً).
`;
    }
    if (intents.financing) {
      intentInstructions += `
موضوع الرسالة: **التقسيط أو التمويل البنكي والشروط**.
- اشرح التمويل **اعتماداً على بيانات البنوك في القسم أعلاه** (نسبة الفائدة، سياسة التمويل إن وُجدت).
- التفاصيل النهائية والموافقة من عند البنك؛ يمكن للعميل متابعة طلب التمويل من صفحة السيارة عند توفر النموذج.
- استخدم بيانات التواصل للمعرض عند الحاجة لتوجيه العميل.
`;
    }
    if (intents.corporate) {
      intentInstructions += `
موضوع الرسالة: **عروض الشركات والمؤسسات**.
- ركّز على **التنسيق عبر قنوات التواصل الرسمية** في قسم «بيانات التواصل» أعلاه (هاتف، واتساب، بريد).
- لا تخترع أرقاماً أو سياسات غير مذكورة في البيانات المقدمة.
`;
    }
    if (needsContactFallback) {
      intentInstructions += `
موضوع الرسالة: **لا توجد نتائج كافية**.
- أخبر العميل بوضوح أنك لا تملك معلومات كافية أو لا توجد سيارات مطابقة حالياً.
- لا تخترع سيارات أو أسعاراً أو مواصفات غير موجودة في البيانات.
- وجّه العميل للتواصل مع الفريق عبر الأزرار التي ستظهر له.
`;
    }

    if (relevantCars.length === 0 && needsContactFallback) {
      const fallbackMessage =
        "عذراً، لا أملك معلومات كافية أو لا توجد سيارات مطابقة لطلبك حالياً في قاعدة بياناتنا. يمكنك التواصل مع فريقنا مباشرة عبر الأزرار أدناه وسنساعدك بشكل أفضل.";
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        {
          role: "assistant",
          content: fallbackMessage,
          payload: { contactActions },
        },
      ]);
      return {
        success: true,
        message: fallbackMessage,
        cars: [],
        offers: [],
        contactActions,
        conversationId: conversation.id,
        mode: conversation.mode,
      };
    }

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

    // Create a context-aware prompt with car dealership information
    const systemContext = `أنت مساعد ذكي لمنصة ماكس موتورز، منصة سعودية متخصصة في بيع السيارات الجديدة وتقديم حلول التمويل في المملكة العربية السعودية.
${intentInstructions}
معلومات عن المنصة:
${buildPlatformInfoForAI(storeInfo)}

دورك:
- الرد على استفسارات العملاء بشكل ودود ومفيد
- مساعدة العملاء في العثور على السيارة المناسبة
- شرح خدمات المنصة
- تقديم معلومات عن العلامات التجارية والموديلات المتوفرة في قاعدة البيانات
- المساعدة في حجز تجربة القيادة
- عرض تفاصيل السيارات المتوفرة
- **استخدم سياق المحادثة السابقة والسيارات المعروضة سابقاً للإجابة على الأسئلة التالية**
- **إذا سأل العميل عن لون أو ميزة معينة، ارجع للسيارات المعروضة في الرد السابق**
- **عندما يسأل العميل "ما السيارات المتوفرة؟" انظر للسياق السابق واعرض السيارات المناسبة فقط من القائمة أدناه**

قواعد الرد المهمة:
- استخدم اللغة العربية الفصحى البسيطة
- كن ودوداً ومحترفاً
- **إذا لم تكن المعلومة في البيانات المقدمة، قل بوضوح أنك لا تعرف — لا تخترع إجابات**
- **لا تذكر سيارات أو أسعاراً غير موجودة في قائمة النتائج أدناه**
- عند عرض معلومات سيارة، قدم التفاصيل كاملة مع السعر والمواصفات بتنسيق احترافي
- **لا تعرض الروابط أو URLs في ردودك أبداً** - المستخدم سيرى بطاقات السيارات المنسقة في الواجهة
- **لا تذكر "رابط السيارة" أو "عرض السيارة" أو أي URLs في النص**
- ركز على وصف السيارات وميزاتها ومواصفاتها فقط
- استخدم الإيموجي بشكل معتدل لجعل الردود أكثر ودية
- استخدم **النص** لتمييز المعلومات المهمة مثل أسماء السيارات والأسعار (مثال: **تويوتا كامري 2024** بسعر **85,000 ر.س**)
- اعرض المعلومات بطريقة منظمة وجذابة دون ذكر الروابط أو الصور
- **مهم جداً**: فقط عندما يكون هناك سيارات متوفرة وتحدثت عنها، أضف في نهاية ردك سطر جديد يبدأ بـ [CARS_TO_SHOW] متبوعاً بأرقام السيارات التي ذكرتها مفصولة بفواصل
- **لا تضيف [CARS_TO_SHOW] إذا لم تكن هناك سيارات متوفرة أو لم تذكر سيارات محددة في ردك**
- مثال: إذا تحدثت عن السيارة 1 والسيارة 3، أضف: [CARS_TO_SHOW]1,3
- **قاعدة حاسمة**: عند ذكر أسماء السيارات في ردك، استخدم **بالضبط** نفس أسماء العلامات التجارية والموديلات الموجودة في قاعدة البيانات أعلاه
${banksContext}${storeContactContext}${salaryContext}
${previousCarsContext}

السيارات المتوفرة حالياً في قاعدة البيانات (نتائج البحث الحالية):
${carsContext}
${priceContext}

الآن، قم بالرد على رسالة العميل التالية:`;

    const prompt = `${systemContext}${conversationText}\n\nرسالة العميل الحالية: ${correctedMessage}${shouldShowCorrection ? ` (تم تصحيح من: ${message})` : ''}`;

    // Generate response with retry logic for 503 errors
    logger.debug("[chatbot] Sending prompt to Gemini AI");

    let result;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        logger.debug("[chatbot] AI response received", { responseLength: text.length });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        logger.error("[chatbot] Gemini AI error", {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          message: error.message,
        });

        // Check if it's a 503 Service Unavailable error
        if (error.status === 503 || error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            logger.info("[chatbot] Model overloaded, retrying", {
              delayMs,
              nextAttempt: attempt + 2,
              maxAttempts: maxRetries + 1,
            });
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          } else {
            logger.warn("[chatbot] Max retries reached for model overload");
          }
        } else {
          // Not a 503 error, don't retry
          throw error;
        }
      }
    }

    // If we get here without a successful result, throw the last error
    if (!result) {
      throw lastError;
    }

    const response = await result.response;
    const text = response.text();

    // Parse the response to extract which cars to show
    let cleanedText = text.trim();
    let carsToShow = relevantCars; // Default: show all cars
    
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
