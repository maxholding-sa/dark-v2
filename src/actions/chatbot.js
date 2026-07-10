"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serializedCarsData } from "@/lib/helper";

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

// Helper function to search cars in database based on user query
async function searchCarsInDatabase(query, conversationHistory = []) {
  try {
    logger.debug("[chatbot] Searching cars", {
      queryLength: query?.length || 0,
      historyLength: conversationHistory.length,
    });
    
    // تصحيح الأخطاء الإملائية في النص المدخل
    const correctedQuery = correctArabicSpelling(query);
    logger.debug("[chatbot] Spell correction result", {
      changed: correctedQuery !== query,
    });
    
    // Extract potential search terms from the corrected query
    const searchTerms = correctedQuery.toLowerCase();
    
    // Build context from previous conversation
    let contextualSearchTerms = searchTerms;
    let maintainPreviousFilters = false;
    
    // Check if current query is a general "show me cars" type request
    const generalFollowUpQueries = [
      "متوفر", "متاح", "available", "show", "عرض", "اعرض",
      "كل", "جميع", "all", "السيارات", "cars", "ايه", "ايش", "what"
    ];
    
    const isGeneralFollowUp = generalFollowUpQueries.some(term => searchTerms.includes(term)) 
      && searchTerms.split(/\s+/).length <= 4; // Short queries are likely follow-ups
    
    if (conversationHistory.length > 0) {
      // Get last 3 user messages to understand context
      const recentUserMessages = conversationHistory
        .filter(msg => msg.sender === "user")
        .slice(-3)
        .map(msg => {
          // تطبيق تصحيح الأخطاء على رسائل المحادثة السابقة أيضاً
          const correctedMessage = correctArabicSpelling(msg.text);
          return correctedMessage.toLowerCase();
        })
        .join(' ');
      
      // If current query is general but previous queries had specific filters, maintain those filters
      if (isGeneralFollowUp && recentUserMessages.length > 0) {
        logger.debug("[chatbot] General follow-up detected");
        contextualSearchTerms = `${recentUserMessages} ${searchTerms}`.toLowerCase();
        maintainPreviousFilters = true;
      } else {
        contextualSearchTerms = `${recentUserMessages} ${searchTerms}`.toLowerCase();
      }
      
      logger.debug("[chatbot] Using contextual search terms from conversation history");
      if (maintainPreviousFilters) {
        logger.debug("[chatbot] Maintaining previous search filters from context");
      }
    }
    
    // Build dynamic search conditions
    const whereConditions = {
      status: "AVAILABLE", // Only show available cars
      AND: [], // Use AND to combine DIFFERENT types of filters (make + color, etc.)
      OR: []   // Use OR for alternatives within same category
    };

    // Common car makes in Arabic and English
    const carMakes = [
      { ar: ["اودي", "أودي"], en: "audi" },
      { ar: ["بي ام دبليو", "بي إم دبليو", "بي أم دبليو", "بيام دبليو"], en: "bmw" },
      { ar: ["مرسيدس", "مرسيدس بنز"], en: "mercedes" },
      { ar: ["تويوتا"], en: "toyota" },
      { ar: ["هوندا"], en: "honda" },
      { ar: ["نيسان"], en: "nissan" },
      { ar: ["هيونداي", "هونداي"], en: "hyundai" },
      { ar: ["كيا"], en: "kia" },
      { ar: ["فورد"], en: "ford" },
      { ar: ["شيفروليه", "شفروليه"], en: "chevrolet" },
      { ar: ["لكزس", "ليكزس"], en: "lexus" },
      { ar: ["فولكس فاجن", "فولكس واجن"], en: "volkswagen" },
      { ar: ["ميتسوبيشي"], en: "mitsubishi" },
      { ar: ["جيب"], en: "jeep" },
      { ar: ["مازدا"], en: "mazda" },
      { ar: ["سوبارو"], en: "subaru" },
      { ar: ["بورش", "بورشه"], en: "porsche" },
      { ar: ["تسلا", "تيسلا"], en: "tesla" },
      { ar: ["رنج روفر", "رينج روفر"], en: "range rover" },
    ];

    // Check if contextual search mentions any car make
    let makeConditions = [];
    
    // Also search with the original query (before correction) to handle cases where both spellings exist in DB
    const originalSearchTerms = query.toLowerCase();
    
    carMakes.forEach(({ ar, en }) => {
      // Check all Arabic variations in contextual search
      const matchesArabic = ar.some(arabicName => contextualSearchTerms.includes(arabicName));
      const matchesEnglish = contextualSearchTerms.includes(en.toLowerCase());
      
      if (matchesArabic || matchesEnglish) {
        logger.debug("[chatbot] Matched car make", { make: en });
        // Add make condition (will be combined with other filters using AND)
        makeConditions.push(
          { make: { contains: en, mode: "insensitive" } }, // English version
          ...ar.map(arabicName => ({ make: { contains: arabicName, mode: "insensitive" } })) // All Arabic versions
        );
      }
    });
    
    // Also add the original query terms to search (in case the exact spelling exists in DB)
    const searchStopWords = new Set([
      "ابحث", "عن", "سيارة", "سيارات", "للبيع", "موديل", "موديلات",
      "car", "cars", "for", "sale", "show", "find", "search",
    ]);
    const originalWords = originalSearchTerms
      .split(/\s+/)
      .filter((word) => word.length > 2 && !searchStopWords.has(word));
    originalWords.forEach((word) => {
      makeConditions.push(
        { make: { contains: word, mode: "insensitive" } },
        { model: { contains: word, mode: "insensitive" } },
        { description: { contains: word, mode: "insensitive" } }
      );
    });
    
    if (makeConditions.length > 0) {
      // Add make conditions to OR (search for this brand)
      whereConditions.OR.push(...makeConditions);
      logger.debug("[chatbot] Added make search conditions", { count: makeConditions.length });
    }

    // Common car models in Arabic and English
    const carModels = [
      { ar: ["كامري", "كامرى", "كامر"], en: "camry" },
      { ar: ["كورولا", "كوروللا", "كورلا"], en: "corolla" },
      { ar: ["هايلكس", "هيلكس", "هايلوكس"], en: "hilux" },
      { ar: ["هايلاندر", "هايلندر", "هاي لاندر"], en: "highlander" },
      { ar: ["اكورد", "أكورد"], en: "accord" },
      { ar: ["سيفيك", "سفك"], en: "civic" },
      { ar: ["التيما", "ألتيما"], en: "altima" },
      { ar: ["اكسنت", "أكسنت"], en: "accent" },
      { ar: ["النترا", "إلنترا"], en: "elantra" },
      { ar: ["سوناتا", "صوناتا"], en: "sonata" },
      { ar: ["توسان", "توسون"], en: "tucson" },
      { ar: ["سبورتاج", "سبورتيج"], en: "sportage" },
      { ar: ["سيراتو", "سراتو"], en: "cerato" },
      { ar: ["اوبتيما", "أوبتيما"], en: "optima" },
      { ar: ["باترول", "بترول"], en: "patrol" },
      { ar: ["اكستريل", "إكستريل"], en: "x-trail" },
      { ar: ["صني", "سني"], en: "sunny" },
      { ar: ["تاهو", "طاهو"], en: "tahoe" },
      { ar: ["كابتيفا", "كابتفا"], en: "captiva" },
      { ar: ["كروز", "كروس"], en: "cruze" },
      { ar: ["اكسبلورر", "إكسبلورر"], en: "explorer" },
      { ar: ["فوكس", "فكس"], en: "focus" },
      { ar: ["فيوجن", "فيوژن"], en: "fusion" },
      { ar: ["موستنج", "موستانج"], en: "mustang" },
      { ar: ["رنجلر", "رانجلر"], en: "wrangler" },
      { ar: ["شيروكي", "تشيروكي"], en: "cherokee" },
      { ar: ["جراند شيروكي"], en: "grand cherokee" },
      { ar: ["لانسر", "لنسر"], en: "lancer" },
      { ar: ["باجيرو", "باچيرو"], en: "pajero" },
      { ar: ["ام اكس 5", "ام اكس5"], en: "mx-5" },
      { ar: ["سي اكس 5", "سي اكس5"], en: "cx-5" },
      { ar: ["فورستر", "فورستار"], en: "forester" },
      { ar: ["امبريزا", "إمبريزا"], en: "impreza" },
      { ar: ["راف فور", "راف4", "راف٤"], en: "rav4" },
      { ar: ["إنوفا", "انوفا"], en: "innova" },
    ];

    // Check if contextual search mentions any car model
    let modelConditions = [];
    
    carModels.forEach(({ ar, en }) => {
      const matchesArabic = ar.some(arabicName => contextualSearchTerms.includes(arabicName));
      const matchesEnglish = contextualSearchTerms.includes(en.toLowerCase());
      
      if (matchesArabic || matchesEnglish) {
        logger.debug("[chatbot] Matched car model", { model: en });
        // Add model condition - search for this model
        modelConditions.push(
          { model: { contains: en, mode: "insensitive" } }, // English version
          ...ar.map(arabicName => ({ model: { contains: arabicName, mode: "insensitive" } })) // All Arabic versions
        );
      }
    });
    
    // If model was found, add it as a standalone filter (user searching for specific model)
    if (modelConditions.length > 0) {
      // Don't use AND - use OR so we can find the model even without make
      whereConditions.OR.push(...modelConditions);
      logger.debug("[chatbot] Added model search conditions", { count: modelConditions.length });
    }

    // Search by body type
    const bodyTypes = [
      { ar: ["دفع رباعي", "دفع رباعى"], en: "دفع رباعي", search: ["suv", "4x4"] },
      { ar: ["سيدان", "سيدان"], en: "سيدان", search: ["sedan"] },
      { ar: ["هاتشباك", "هاتشباك"], en: "هاتشباك", search: ["hatchback"] },
      { ar: ["كشف"], en: "كشف", search: ["convertible", "cabrio"] },
      { ar: ["كوبيه", "كوبية"], en: "كوبيه", search: ["coupe"] },
      { ar: ["ستيشن"], en: "ستيشن", search: ["wagon", "station"] },
      { ar: ["بيك اب", "بيك أب"], en: "بيك أب", search: ["pickup", "truck"] },
      { ar: ["رياضية", "رياضيه"], en: "رياضية", search: ["sport", "sports", "sportscar"] },
    ];

    // Body / color / fuel: use current message only so stacked context + luxury لا تفرض OR متضاربة (مثلاً سيدان من لصق بطاقة + سيارة SUV في القاعدة)
    const termsForBodyColorFuel = searchTerms;

    let bodyTypeConditions = [];
    bodyTypes.forEach(({ ar, en, search }) => {
      const matchesArabic = ar.some(arabicName => termsForBodyColorFuel.includes(arabicName));
      const matchesEnglish = search.some(englishName => termsForBodyColorFuel.includes(englishName));
      
      if (matchesArabic || matchesEnglish) {
        logger.debug("[chatbot] Matched body type", { bodyType: en });
        bodyTypeConditions.push({
          bodyType: { contains: en, mode: "insensitive" }
        });
      }
    });
    
    if (bodyTypeConditions.length > 0) {
      // Add body type to OR
      whereConditions.OR.push(...bodyTypeConditions);
      logger.debug("[chatbot] Added body type search conditions", { count: bodyTypeConditions.length });
    }

    // Search by fuel type
    let fuelTypeConditions = [];
    if (termsForBodyColorFuel.includes("كهربائي") || termsForBodyColorFuel.includes("كهربائى") || termsForBodyColorFuel.includes("electric")) {
      logger.debug("[chatbot] Matched fuel type", { fuelType: "electric" });
      fuelTypeConditions.push({ fuelType: "كهربائي" });
    }
    if (termsForBodyColorFuel.includes("هجين") || termsForBodyColorFuel.includes("هايبرد") || termsForBodyColorFuel.includes("hybrid")) {
      logger.debug("[chatbot] Matched fuel type", { fuelType: "hybrid" });
      fuelTypeConditions.push({ 
        fuelType: { in: ["هجين", "هجين قابل للشحن"] }
      });
    }
    
    if (fuelTypeConditions.length > 0) {
      // Add fuel type to OR
      whereConditions.OR.push(...fuelTypeConditions);
      logger.debug("[chatbot] Added fuel type search conditions", { count: fuelTypeConditions.length });
    }

    // Search by color
    const colors = [
      { ar: ["أحمر", "احمر", "حمراء"], en: ["red", "أحمر"] },
      { ar: ["أسود", "اسود", "سوداء"], en: ["black", "أسود"] },
      { ar: ["أبيض", "ابيض", "بيضاء"], en: ["white", "أبيض"] },
      { ar: ["أزرق", "ازرق", "زرقاء"], en: ["blue", "أزرق"] },
      { ar: ["رمادي", "رمادى", "رصاصي"], en: ["gray", "grey", "رمادي"] },
      { ar: ["فضي", "فضى"], en: ["silver", "فضي"] },
      { ar: ["أخضر", "اخضر", "خضراء"], en: ["green", "أخضر"] },
      { ar: ["أصفر", "اصفر", "صفراء"], en: ["yellow", "أصفر"] },
      { ar: ["برتقالي", "برتقالى"], en: ["orange", "برتقالي"] },
      { ar: ["بني", "بنى", "بنية"], en: ["brown", "بني"] },
      { ar: ["ذهبي", "ذهبى"], en: ["gold", "ذهبي"] },
      { ar: ["بيج", "بيچ"], en: ["beige", "بيج"] },
    ];

    let colorConditions = [];
    colors.forEach(({ ar, en }) => {
      const matchesArabic = ar.some(arabicName => termsForBodyColorFuel.includes(arabicName));
      const matchesEnglish = en.some(englishName => termsForBodyColorFuel.includes(englishName.toLowerCase()));
      
      if (matchesArabic || matchesEnglish) {
        logger.debug("[chatbot] Matched color", { color: en[en.length - 1] });
        // Search for both Arabic and English color names
        colorConditions.push(
          ...en.map(colorName => ({ color: { contains: colorName, mode: "insensitive" } })),
          ...ar.map(colorName => ({ color: { contains: colorName, mode: "insensitive" } }))
        );
      }
    });
    
    if (colorConditions.length > 0) {
      // Add color to OR
      whereConditions.OR.push(...colorConditions);
      logger.debug("[chatbot] Added color search conditions", { count: colorConditions.length });
    }

    // Luxury cars: Car.isLuxury === true ⇔ وسم «فاخرة» في الموقع/لوحة التحكم (same field)
    const luxuryKeywords = [
      "فاخر",
      "فاخرة",
      "فاره",
      "فارهة",
      "فارهه",
      "سيارة فارهة",
      "سيارات فارهة",
      "وسم فارهة",
      "بالفارهة",
      "luxury",
      "luxurious",
      "lexury",
      "lexuary",
      "prestige",
      "راقي",
      "راقية",
      "لكسري",
      "فخم",
      "فخمة",
    ];
    const wantsLuxuryCars = luxuryKeywords.some((kw) =>
      contextualSearchTerms.includes(kw.toLowerCase())
    );
    if (wantsLuxuryCars) {
      logger.debug("[chatbot] Luxury intent detected");
      whereConditions.AND.push({ isLuxury: true });
    }

    // Check for general "show me cars" type queries
    const generalCarQueries = [
      "سيارات", "سيارة", "عربيات", "عربية",
      "cars", "car", "vehicles", "vehicle",
      "متوفر", "متاح", "available"
    ];
    
    const isGeneralQuery = generalCarQueries.some(term => searchTerms.includes(term));
    
    // If no specific search terms found, search broadly or show all available
    if (whereConditions.AND.length === 0 && whereConditions.OR.length === 0) {
      logger.debug("[chatbot] No specific filters matched, using broad search");
      
      // IMPORTANT: If this is a general follow-up and we should maintain filters
      // but no filters were extracted, it means the context was too vague
      // In this case, show featured cars but log the issue
      if (maintainPreviousFilters && isGeneralQuery) {
        logger.debug("[chatbot] Context filters were too vague, falling back to featured cars");
      } else if (isGeneralQuery && !maintainPreviousFilters) {
        // For very general queries with no context, just show featured cars first
        logger.debug("[chatbot] General query detected, showing featured cars");
        // Don't add AND/OR conditions, the query will just use status: AVAILABLE
      } else {
        // For specific text search - search with BOTH original and corrected queries
        // This handles cases where both spellings exist in the database (e.g., تاما and تويوتا)
        const correctedSearchQuery = correctArabicSpelling(query);
        const queryWords = query.split(/\s+/).filter(word => word.length > 1);
        
        logger.debug("[chatbot] Searching in all car text fields");
        
        whereConditions.OR.push(
          // Search with original query in ALL relevant fields
          { make: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
          { color: { contains: query, mode: "insensitive" } },
          { bodyType: { contains: query, mode: "insensitive" } },
          { fuelType: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          // Search with corrected query (only if different)
          ...(correctedSearchQuery !== query ? [
            { make: { contains: correctedSearchQuery, mode: "insensitive" } },
            { model: { contains: correctedSearchQuery, mode: "insensitive" } },
            { color: { contains: correctedSearchQuery, mode: "insensitive" } },
            { bodyType: { contains: correctedSearchQuery, mode: "insensitive" } },
            { fuelType: { contains: correctedSearchQuery, mode: "insensitive" } },
            { description: { contains: correctedSearchQuery, mode: "insensitive" } },
          ] : []),
          // Search individual words from original query in make, model, and color
          ...queryWords.flatMap(word => [
            { make: { contains: word, mode: "insensitive" } },
            { model: { contains: word, mode: "insensitive" } },
            { color: { contains: word, mode: "insensitive" } },
            { bodyType: { contains: word, mode: "insensitive" } },
          ])
        );
      }
    } else {
      // Filters were found - log what we're searching for
      const totalFilters = whereConditions.AND.length + whereConditions.OR.length;
      logger.debug("[chatbot] Filters applied to search", {
        totalFilters,
        andCount: whereConditions.AND.length,
        orCount: whereConditions.OR.length,
      });
      if (maintainPreviousFilters) {
        logger.debug("[chatbot] Maintained context filters from previous conversation");
      }
    }

    // Execute the search
    logger.debug("[chatbot] Executing database query", {
      andCount: whereConditions.AND.length,
      orCount: whereConditions.OR.length,
    });
    
    // Build the final where clause
    const finalWhereConditions = { status: "AVAILABLE" };
    
    // Combine AND and OR conditions properly
    if (whereConditions.AND.length > 0 && whereConditions.OR.length > 0) {
      // Both AND and OR conditions exist - combine them
      finalWhereConditions.AND = [
        ...whereConditions.AND,
        { OR: whereConditions.OR }
      ];
    } else if (whereConditions.AND.length > 0) {
      // Only AND conditions
      finalWhereConditions.AND = whereConditions.AND;
    } else if (whereConditions.OR.length > 0) {
      // Only OR conditions (like searching for a model name)
      finalWhereConditions.OR = whereConditions.OR;
    }
    // If neither, just status: AVAILABLE (show featured cars)

    const orderBy = wantsLuxuryCars
      ? [
          { featured: "desc" },
          { price: "desc" },
          { createdAt: "desc" },
        ]
      : [{ featured: "desc" }, { createdAt: "desc" }];

    const carSelect = {
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
      seats: true,
      description: true,
      images: true,
      featured: true,
      isLuxury: true,
    };

    let cars = await db.car.findMany({
      where: finalWhereConditions,
      take: 5, // Limit to 5 results to avoid overwhelming the AI
      orderBy,
      select: carSelect,
    });

    // فخامة + شروط OR (لون/هيكل/…) قد تُصفّر النتائج رغم وجود سيارات فارهة — أعد المحاولة بفلتر isLuxury فقط
    if (cars.length === 0 && wantsLuxuryCars) {
      logger.debug("[chatbot] Luxury search returned no rows, retrying with luxury-only filter");
      cars = await db.car.findMany({
        where: { status: "AVAILABLE", isLuxury: true },
        take: 5,
        orderBy,
        select: carSelect,
      });
    }

    logger.debug("[chatbot] Database returned cars", { count: cars.length });
    if (cars.length > 0) {
      logger.debug("[chatbot] Sample result available", {
        make: cars[0].make,
        model: cars[0].model,
      });
    }
    
    return cars.map((car) => serializedCarsData(car));
  } catch (error) {
    console.error("Error searching cars in database:", error);
    return [];
  }
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
السعر: $${Number(car.price).toLocaleString()}
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

const CAR_SELECT_CHATBOT = {
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
  seats: true,
  description: true,
  images: true,
  featured: true,
  isLuxury: true,
};

function detectChatIntents(text) {
  const corporate =
    /شركات|مؤسسات|عروض الشركات|المؤسسات|جهات|أسطول|fleet|قطاع\s*حكومي/i.test(
      text
    );
  const financing =
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

  return { corporate, financing, compare, economical, latestOffers };
}

async function fetchLatestOfferCars() {
  const cars = await db.car.findMany({
    where: { status: "AVAILABLE" },
    take: 8,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: CAR_SELECT_CHATBOT,
  });

  return cars.map((car) => serializedCarsData(car));
}

async function fetchEconomicalCars() {
  const cars = await db.car.findMany({
    where: { status: "AVAILABLE" },
    take: 8,
    orderBy: [{ price: "asc" }, { mileage: "asc" }],
    select: CAR_SELECT_CHATBOT,
  });

  return cars.map((car) => serializedCarsData(car));
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

export async function getChatbotResponse(message, conversationHistory = []) {
  try {
    logger.debug("[chatbot] Received message", {
      messageLength: message?.length || 0,
      historyLength: conversationHistory.length,
    });
    
    // تصحيح الأخطاء الإملائية في رسالة المستخدم
    const correctedMessage = correctArabicSpelling(message);
    const shouldShowCorrection = correctedMessage !== message;
    logger.debug("[chatbot] Spell check result", { corrected: shouldShowCorrection });
    
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

    let relevantCars = [];
    if (intents.economical) {
      relevantCars = await fetchEconomicalCars();
      logger.debug("[chatbot] Using economical car set");
    } else if (intents.latestOffers) {
      relevantCars = await fetchLatestOfferCars();
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

    if (
      (intents.financing || intents.corporate) &&
      relevantCars.length === 0
    ) {
      relevantCars = await fetchLatestOfferCars();
      logger.debug("[chatbot] Added sample cars for financing/corporate context");
    }

    logger.debug("[chatbot] Relevant cars resolved", { count: relevantCars.length });

    const banks = intents.financing ? await fetchBanksForChatbot() : [];
    const storeInfo =
      intents.financing || intents.corporate
        ? await fetchStoreInfoForChatbot()
        : null;

    const banksContext = intents.financing
      ? `\n\n=== بيانات البنوك والتمويل (من جدول البنوك في لوحة التحكم) ===\n${formatBanksForAI(banks)}`
      : "";

    const storeContactContext =
      intents.financing || intents.corporate
        ? `\n\n=== بيانات التواصل الرسمية للمعرض (من إعدادات المتجر) ===\n${formatStoreForAI(storeInfo)}`
        : "";

    let intentInstructions = "";
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
- متوسط السعر: $${Number(priceStats.average).toLocaleString()}
- عدد السيارات المتوفرة: ${priceStats.count}
- أقل سعر: $${priceStats.min.toLocaleString()}
- أعلى سعر: $${priceStats.max.toLocaleString()}`;
        }
      }
    } else if (relevantCars.length > 0) {
      // For non-price queries, use the original format
      priceContext = `\n\nالسيارات المتوفرة حالياً في قاعدة البيانات (نتائج البحث الحالية):\n${formatCarsForAI(relevantCars)}`;
    }

    // Create a context-aware prompt with car dealership information
    const systemContext = `أنت مساعد ذكي لمنصة ماكس موتورز، منصة متخصصة في بيع وشراء السيارات في المملكة العربية السعودية.
${intentInstructions}
معلومات عن المنصة:
- نوفر آلاف السيارات الجديدة والمستعملة المفحوصة
- يمكن للمستخدمين حجز اختبار قيادة بسهولة عبر الإنترنت
- لدينا علامات تجارية مميزة مثل: تويوتا، BMW، مرسيدس، هيونداي، كيا، نيسان، فورد، شيفروليه
- **سيارة فاخرة (luxury)** = أي سيارة عليها وسم **«فاخرة»** في الموقع؛ هذا يطابق الحقل isLuxury في قاعدة البيانات. لا تُسمِّ سيارة «فاخرة» إلا إذا وردت في النتائج أدناه مع سطر يذكر وسم الفاخرة أو isLuxury
- نوفر سيارات كهربائية وهجينة
- جميع السيارات تأتي مع تقرير فحص شامل
- عملية شراء آمنة ومضمونة
- دعم العملاء متوفر على مدار الساعة
- التمويل متاح من خلال شركاء معتمدين

دورك:
- الرد على استفسارات العملاء بشكل ودود ومفيد
- مساعدة العملاء في العثور على السيارة المناسبة
- شرح خدمات المنصة
- تقديم معلومات عن العلامات التجارية والموديلات المتوفرة في قاعدة البيانات
- المساعدة في حجز اختبار القيادة
- عرض تفاصيل السيارات المتوفرة مع الروابط والصور
- **استخدم سياق المحادثة السابقة والسيارات المعروضة سابقاً للإجابة على الأسئلة التالية**
- **إذا سأل العميل عن لون أو ميزة معينة، ارجع للسيارات المعروضة في الرد السابق**
- **🔥 مهم جداً: عندما يسأل العميل "ما السيارات المتوفرة؟" أو "اعرض لي السيارات"، انظر للسياق - إذا كان قد طلب قبل ذلك نوع معين (مثل سيارة عائلية، دفع رباعي، تويوتا، إلخ)، فاعرض فقط السيارات التي تطابق ذلك النوع من القائمة أدناه**
- **السيارات المعروضة أدناه هي بالفعل مصفاة بناءً على سياق المحادثة - لا تطلب "جميع" السيارات بل تحدث عن السيارات المناسبة للبحث السابق**

قواعد الرد المهمة:
- استخدم اللغة العربية الفصحى البسيطة
- كن ودوداً ومحترفاً
- عند عرض معلومات سيارة، قدم التفاصيل كاملة مع السعر والمواصفات بتنسيق احترافي
- **لا تعرض الروابط أو URLs في ردودك أبداً** - المستخدم سيرى بطاقات السيارات المنسقة في الواجهة
- **لا تذكر "رابط السيارة" أو "عرض السيارة" أو أي URLs في النص**
- ركز على وصف السيارات وميزاتها ومواصفاتها فقط
- استخدم الإيموجي بشكل معتدل لجعل الردود أكثر ودية
- استخدم **النص** لتمييز المعلومات المهمة مثل أسماء السيارات والأسعار (مثال: **تويوتا كامري 2024** بسعر **$28,000**)
- اعرض المعلومات بطريقة منظمة وجذابة دون ذكر الروابط أو الصور
- **مهم جداً**: فقط عندما يكون هناك سيارات متوفرة وتحدثت عنها، أضف في نهاية ردك سطر جديد يبدأ بـ [CARS_TO_SHOW] متبوعاً بأرقام السيارات التي ذكرتها مفصولة بفواصل
- **لا تضيف [CARS_TO_SHOW] إذا لم تكن هناك سيارات متوفرة أو لم تذكر سيارات محددة في ردك**
- مثال: إذا تحدثت عن السيارة 1 والسيارة 3، أضف: [CARS_TO_SHOW]1,3
- **قاعدة حاسمة**: عند ذكر أسماء السيارات في ردك، استخدم **بالضبط** نفس أسماء العلامات التجارية والموديلات الموجودة في قاعدة البيانات أعلاه (مثال: إذا كانت السيارة في القاعدة هي "تويوتا كامري"، اذكرها "تويوتا كامري" وليس "تاما كامري" أو أي تهجئة أخرى)
- **يجب أن تتطابق أسماء السيارات في ردك مع الأسماء في قاعدة البيانات تماماً** لضمان تطابق بطاقات السيارات المعروضة مع النص
${banksContext}${storeContactContext}
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

    // Save chat log to database for analytics
    try {
      await db.chatLog.create({
        data: {
          userId: null, // Will be populated if user is authenticated (future enhancement)
          sessionId: `session_${Date.now()}`, // Simple session tracking
          userMessage: message, // الرسالة الأصلية من المستخدم
          correctedMessage: shouldShowCorrection ? correctedMessage : null, // Save corrected version if different
          aiResponse: cleanedText,
          carsFound: relevantCars.length,
          carsShown: carsToShow.length,
          carIds: carsToShow.map(car => car.id),
          language: /[\u0600-\u06FF]/.test(message) ? "ar" : "en", // Detect Arabic script
        }
      });
      logger.debug("[chatbot] Chat log saved to database");
    } catch (logError) {
      logger.error("[chatbot] Failed to save chat log", logError);
      // Don't throw error - logging failure shouldn't break the chat
    }

    return {
      success: true,
      message: cleanedText,
      carsFound: relevantCars.length,
      cars: carsToShow, // Include only the cars that AI mentioned
    };
  } catch (error) {
    console.error("Error generating chatbot response:", error);
    
    // Provide fallback responses
    return {
      success: false,
      message:
        "عذراً، واجهت مشكلة في الاتصال. يمكنك تصفح السيارات المتاحة أو التواصل مع فريق الدعم للمساعدة. 😊",
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
