"use server";

import { after } from "next/server";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateContentResilient } from "@/lib/gemini";
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
  parseCompareEntities,
} from "@/lib/chat-compare";
import { searchCarsForChat } from "@/lib/chat-car-search";
import {
  wantsSalaryRecommendation,
  wantsInstallmentBudget,
} from "@/lib/chat-affordability";
import { getPublicMandebs } from "@/actions/mandeb";
import { runChatAgent } from "@/lib/chat-agent";
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
  
  "هونداي": "هيونداي",
  "هايونداي": "هيونداي",
  "هونداى": "هيونداي",
  "هايوندا": "هيونداي",
  "هايونده": "هيونداي",
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

const META_CACHE_MS = 60 * 1000;
let banksCache = { data: null, at: 0 };
let storeCache = { data: undefined, at: 0 };

async function fetchBanksForChatbot() {
  try {
    if (
      banksCache.data &&
      Date.now() - banksCache.at < META_CACHE_MS
    ) {
      return banksCache.data;
    }
    const data = await db.bank.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        interestRate: true,
        loanPolicy: true,
      },
    });
    banksCache = { data, at: Date.now() };
    return data;
  } catch (e) {
    console.error("fetchBanksForChatbot:", e);
    return banksCache.data || [];
  }
}

async function fetchStoreInfoForChatbot() {
  try {
    if (
      storeCache.data !== undefined &&
      Date.now() - storeCache.at < META_CACHE_MS
    ) {
      return storeCache.data;
    }
    const data = await db.storeInfo.findFirst();
    storeCache = { data, at: Date.now() };
    return data;
  } catch (e) {
    console.error("fetchStoreInfoForChatbot:", e);
    return storeCache.data ?? null;
  }
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

    // Only the stateful wizards still need a keyword guess up front; every
    // other intent is now the agent's job.
    const salaryIntentEarly = wantsSalaryRecommendation(correctedMessage);
    const installmentBudgetEarly = wantsInstallmentBudget(correctedMessage);

    // Leave financing car-select for free chat — but KEEP compare mode active
    if (conversation.mode === LOAN_CHAT_MODES.CAR_SELECT) {
      await updateChatConversationState(conversation.id, {
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      });
      conversation = await getConversationById(conversation.id);
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

    // ── Free conversation: an agent that decides what to look up ─────────────
    // Everything below used to be a regex router that guessed the intent, ran
    // one hard-coded query, and handed the model a fixed context blob. The
    // model now picks its own tools, so it can answer questions nobody wrote a
    // keyword for and it never answers about inventory from memory.
    const previousCars = (() => {
      const lastBot = [...conversationHistory]
        .reverse()
        .find((msg) => msg.sender === "bot" && msg.cars?.length);
      return lastBot?.cars || [];
    })();

    const agentReply = await runChatAgent({
      // Raw text on purpose: the model reads typos and slang better than the
      // substitution table does, and the table has no idea which of two similar
      // brands the customer meant.
      message,
      conversationHistory,
      previousCars,
      fetchStoreInfo: fetchStoreInfoForChatbot,
      fetchBanks: fetchBanksForChatbot,
      fetchSalesReps: async () => {
        const result = await getPublicMandebs().catch(() => null);
        return result?.success ? result.data || [] : [];
      },
      buildContactActions: () => buildContactActions(),
      deadlineMs: options?.deadlineMs,
    });

    const cleanedText =
      agentReply.text ||
      "عذراً، لم أستطع تجهيز الرد الآن. تواصل مع فريقنا عبر الأزرار أدناه وسنساعدك مباشرة.";
    const carsToShow = agentReply.cars;
    const quickReplies = agentReply.quickReplies;
    let contactActions = agentReply.contactActions;
    const relevantCars = agentReply.seenCars;

    // A blank reply is worse than an honest handoff.
    if (!cleanedText) {
      contactActions = contactActions || (await buildContactActions().catch(() => null));
    }


    // Persist conversation history before returning (needed for reload/history).
    // Analytics chatLog can wait — don't block the user on Clerk + extra insert.
    try {
      await appendChatMessages(conversation.id, [
        { role: "user", content: message, payload: null },
        {
          role: "assistant",
          content: cleanedText,
          payload: { cars: carsToShow, contactActions, quickReplies },
        },
      ]);
    } catch (logError) {
      logger.error("[chatbot] Failed to append conversation messages", logError);
    }

    after(async () => {
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
            carIds: carsToShow.map((car) => car.id),
            language: /[\u0600-\u06FF]/.test(message) ? "ar" : "en",
          },
        });
        logger.debug("[chatbot] Chat log saved");
      } catch (logError) {
        logger.error("[chatbot] Failed to save chat log", logError);
      }
    });

    return {
      success: true,
      message: cleanedText,
      carsFound: relevantCars.length,
      cars: carsToShow,
      offers: [],
      contactActions,
      quickReplies,
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

    const { text } = await generateContentResilient(prompt);
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
