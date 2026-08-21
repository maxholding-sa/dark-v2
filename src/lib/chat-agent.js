import { logger } from "@/lib/logger";
import { runGeminiToolLoop, isGeminiDeadlineError } from "@/lib/gemini";
import { normalizeSearchText } from "@/lib/car-search";
import {
  CHAT_AGENT_TOOLS,
  createChatToolRuntime,
} from "@/lib/chat-agent-tools";

/**
 * The free-conversation brain.
 *
 * Everything the assistant knows about the dealership comes from tools it
 * chooses to call, so it can answer questions no one wrote a keyword rule for
 * and it cannot invent a car, a price or a phone number.
 */

const SYSTEM_INSTRUCTION = `أنت مستشار مبيعات في معرض «ماكس موتورز» للسيارات في السعودية. أنت إنسان خبير في السيارات والتمويل، لست روبوت أسئلة وأجوبة.

# شخصيتك
- ودود، واثق، مختصر. تتكلم كبائع محترف يعرف بضاعته، لا كقائمة خدمات.
- تطابق لغة العميل ولهجته: إذا كتب بالعامية السعودية رد بعامية مهذبة، وإذا كتب بالإنجليزية رد بالإنجليزية، وإذا كتب بالفصحى رد بالفصحى.
- تفهم الأخطاء الإملائية والاختصارات والأسماء الشعبية للسيارات بدون أن تصحّح العميل أو تعلّق عليها.

# كيف تفكّر قبل أن ترد
1. اسأل نفسك: ما الذي يحتاجه هذا العميل فعلاً؟ الرسالة الحرفية أحياناً ليست كل القصة.
   - «عندي عيال كثار» ← مقاعد ٧ فأكثر.
   - «دوامي بعيد» أو «الوقود غالي» ← استهلاك اقتصادي.
   - «أول سيارة لي» ← سعر منخفض، أوتوماتيك، صيانة رخيصة.
   - «للشغل / توصيل / بضاعة» ← سيارات تجارية أو بيك أب.
   - «راتبي كذا» ← ما الذي يقدر عليه بالتقسيط، وليس أرخص سيارة عندنا.
2. استخدم الأدوات للتحقق من الواقع. لا تجب من الذاكرة أبداً عن سيارة أو سعر أو قسط أو بنك.
3. لا تقل «غير متوفر» قبل أن تبحث فعلاً — استخدم search_inventory ثم get_inventory_overview قبل النفي.
4. إن كانت الرسالة ناقصة معلومة تغيّر الجواب فعلاً، ابحث بأفضل افتراض معقول واذكر افتراضك، ثم اسأل سؤالاً توضيحياً واحداً فقط. لا تستجوب العميل.
5. لا تُكثر البحث: استدعِ أداتين أو ثلاثاً على الأكثر، ثم أجب بما توفّر لديك. إذا لم تجد المطلوب بعد محاولتين، قل الحقيقة واعرض أقرب البدائل بدل أن تكرر البحث.

# متى تسأل قبل أن ترشّح
البائع الجيد لا يرمي ثماني سيارات في وجه العميل، ولا يستجوبه. القاعدة: **اسأل فقط إذا كانت إجابة العميل ستغيّر أي سيارة ستعرضها.**

اسأل عبر ask_to_narrow عندما:
- تعيد الأداة نتائج كثيرة، ويظهر في choicesDifferBy محور حقيقي يفرّق بينها (هيكل، وقود، مقاعد، ماركة، أو فرق سعر كبير)، ولا شيء في كلام العميل يرجّح أحد الخيارات.
- يطلب موديلاً موجوداً بعدة فئات وأسعار متباعدة («عندكم كامري؟» وعندنا خمس فئات) — اسأل عن الميزانية أو الفئة.
- الطلب مبهم بطبيعته («ابي سيارة حلوة»، «شي مناسب») ولا تملك أي قيد واحد على الأقل.

**لا تسأل** عندما:
- النتائج متقاربة أو ثلاث فأقل — رشّح مباشرة.
- العميل أعطاك قيداً واضحاً (ميزانية، عدد مقاعد، ماركة) يكفي للترشيح — نفّذ ولا تماطل.
- سبق أن سألته سؤالاً توضيحياً في الرد السابق — لا تسأل مرتين متتاليتين، رشّح بأفضل ما لديك.
- كان المحور الذي تفكر بالسؤال عنه ثابتاً في كل النتائج (لا تسأل «سيدان ولا جيب؟» وكلها جيب).

كيف تسأل:
- **أي سؤال تطرحه ويحمل خيارات («سيدان ولا جيب؟»، «بنزين ولا هجين؟») يجب أن يرافقه استدعاء ask_to_narrow في نفس الرد.** لا تترك سؤال اختيار بلا أزرار — العميل ينتظر شيئاً يضغطه. (السؤال الختامي البسيط من نوع «تحب نحسب لك القسط؟» لا يحتاج أزرار.)
- ابحث مرة واحدة على الأقل قبل أي سؤال توضيحي، حتى تكون الخيارات من المخزون الفعلي لا من خيالك.
- سؤال واحد فقط، بجملة قصيرة طبيعية داخل نصّك، مع ٢-٤ خيارات في ask_to_narrow مأخوذة من النتائج الفعلية.
- لا تعدّد الخيارات كقائمة مرقّمة في النص — الأزرار تظهر للعميل تلقائياً.
- الأفضل أن تعطيه لمحة عمّا لديك ثم تسأل: «عندنا كامري بعدة فئات من ١١٩ ألف إلى ١٥٤ ألف — تفضل الفئة الاقتصادية ولا الفل كامل؟»
- إذا سألت، لا تستدعِ show_cars في نفس الرد إلا إذا كنت تعرض مثالاً واحداً أو اثنين توضيحيين فقط.

# قواعد صارمة
- كل رقم تذكره (سعر، قسط، سنة، ممشى، نسبة بنك) يجب أن يكون قد وصلك من أداة في هذه المحادثة. الاختراع ممنوع.
- أرقام المرجع (ref) للاستخدام الداخلي مع الأدوات فقط. لا تكتبها للعميل أبداً — ميّز بين السيارات بالسعر أو الفئة أو السنة.
- السيارة التي سعرها غير محدد: لا تحسب لها قسطاً ولا تدرجها ضمن ميزانية، واذكر أن سعرها يُطلب من الإدارة.
- الأقساط تقديرية دائماً — قلها بوضوح مرة واحدة، لا في كل جملة.
- لا تكتب أرقام هاتف أو روابط في نصّك. عند الحاجة للتواصل استدعِ get_dealership_info وستظهر الأزرار للعميل تلقائياً.
- عند ذكر سيارات بعينها، استدعِ show_cars بأرقام مرجعها قبل ردك النهائي حتى تظهر بطاقاتها. إن لم تذكر سيارة محددة لا تستدعِها.
- إذا كان السؤال خارج نطاق عملنا أو لا تعرف إجابته: اعتذر بجملة واحدة، استدعِ get_dealership_info، وادعُ العميل للتواصل مع الفريق. لا تنهِ الرد باعتذار فقط.

# أسلوب الرد
- جملتان إلى خمس جمل. لا فقرات طويلة ولا قوائم مكرّرة.
- لا تسرد كل النتائج: رشّح سيارتين أو ثلاثاً مع سبب قصير لكل واحدة («أوفر بالبنزين»، «مقاعدها ٧»).
- أجب على السؤال أولاً، ثم اقترح خطوة واحدة تالية.
- استخدم **النص العريض** لأسماء السيارات والأسعار فقط.
- لا تكرّر ما قلته في رسالة سابقة، وابنِ على السياق: إذا قال «والثانية؟» فهو يقصد السيارة الثانية **من البطاقات المعروضة أمامه في ردك السابق**، لا من نتائج بحث جديد.
- إن أشار إلى ترتيب لا وجود له (قال «الثالثة» وردك السابق فيه سيارتان، أو «الثانية» وأنت عرضت واحدة فقط) فقل ذلك بصراحة واسأله أيّ سيارة يقصد. لا تُبدّلها بسيارة لم يرها قط.
- إن أراد تقديم طلب تمويل، وجّهه لزر «موّل هذه السيارة» على بطاقة السيارة.`;

/**
 * Smaller fallback models occasionally splice a CJK fragment into an Arabic
 * sentence. Nothing in a Saudi dealership reply is ever written in those
 * scripts, so dropping them costs nothing and saves the reply from looking
 * broken.
 */
function sanitizeReply(text = "") {
  return String(text || "")
    .replace(/[\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/g, "")
    // Ref numbers address the tools, not the customer. When one slips into the
    // prose it reads like a database record instead of a salesperson.
    .replace(
      /[([]\s*(?:ال)?(?:مرجع|رقم\s*المرجع|ref(?:erence)?)\s*(?:رقم\s*)?[:#]?\s*\d+\s*[)\]]/gi,
      ""
    )
    .replace(
      /،?\s*(?:ال)?(?:مرجع|ref(?:erence)?)\s*(?:رقم\s*)?[:#]?\s*\d+\b/gi,
      ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([،.!؟])/g, "$1")
    .trim();
}

/** Reply that admits it cannot help — those must always offer a human. */
function looksLikeDeadEndAnswer(text = "") {
  return /عذرا|عذراً|آسف|اسف|للأسف|للاسف|لا أستطيع|لا استطيع|لا أملك|لا املك|لا تتوفر لدي|لا توجد لدي|لا نوفر|لا نقدم|لست متأكد|لا أعرف|لا اعرف|غير متاح|خارج نطاق/i.test(
    String(text || "")
  );
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Prices the reply actually quotes, so we can attach the matching record. */
function pricesQuotedIn(text = "") {
  const western = String(text || "").replace(/[٠-٩]/g, (d) =>
    String(ARABIC_INDIC_DIGITS.indexOf(d))
  );
  const found = western.match(/\d[\d,٬\s]{2,}\d/g) || [];
  return new Set(
    found
      .map((raw) => Number(raw.replace(/[^\d]/g, "")))
      .filter((n) => Number.isFinite(n) && n >= 10000)
  );
}

/** Digits as the model wrote them, separators removed, so prices are findable. */
function normalizeDigits(text = "") {
  return String(text || "")
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)))
    .replace(/(?<=\d)[,٬\s](?=\d)/g, "");
}

/**
 * Order the cards the way the reply talks about them. The model picks refs in
 * whatever order it looked them up, so "الأولى بسعر 119,500" could sit above a
 * card showing 124,050 — and the customer's next "الثانية" then means two
 * different cars to them and to us.
 */
function orderCardsByMention(cars, text) {
  const haystack = normalizeDigits(text);
  const normalizedText = normalizeSearchText(text);

  const positionOf = (car) => {
    const price = Math.round(Number(car?.price));
    if (price > 0) {
      const at = haystack.indexOf(String(price));
      if (at >= 0) return at;
    }
    const model = normalizeSearchText(car?.model);
    if (model) {
      const at = normalizedText.indexOf(model);
      if (at >= 0) return Number.MAX_SAFE_INTEGER / 2 + at;
    }
    return Number.MAX_SAFE_INTEGER;
  };

  return cars
    .map((car, index) => ({ car, index, at: positionOf(car) }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((entry) => entry.car);
}

/**
 * Fallback for when the model names cars but forgets show_cars. Matching on the
 * model name alone attaches the wrong trim when several share it, so a quoted
 * price wins over a name match — that mismatch between the text and the cards
 * is exactly what made the old assistant look careless.
 */
function pickMentionedCars(cars, text) {
  const named = cars.filter((car) => carIsMentionedIn(car, text));
  if (named.length <= 1) return named;

  const quoted = pricesQuotedIn(text);
  if (!quoted.size) return named.slice(0, 6);

  const priced = named.filter((car) => quoted.has(Math.round(Number(car.price))));
  return (priced.length ? priced : named).slice(0, 6);
}

/** Did the reply actually name this car? */
function carIsMentionedIn(car, text = "") {
  const haystack = normalizeSearchText(text);
  if (!haystack) return false;

  const model = normalizeSearchText(car?.model);
  const make = normalizeSearchText(car?.make);

  if (model && model.length > 1 && haystack.includes(model)) return true;

  return Boolean(
    make &&
      model &&
      haystack.includes(make) &&
      model.split(" ").some((part) => part.length > 2 && haystack.includes(part))
  );
}

/** Chat history → Gemini contents. Must start on a user turn. */
function buildGeminiHistory(conversationHistory = [], maxTurns = 12) {
  const mapped = conversationHistory
    .filter((msg) => String(msg?.text || "").trim())
    .slice(-maxTurns)
    .map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: String(msg.text).trim() }],
    }));

  while (mapped.length && mapped[0].role !== "user") mapped.shift();

  // Gemini rejects two consecutive turns from the same role.
  return mapped.filter((turn, i) => i === 0 || turn.role !== mapped[i - 1].role);
}

/**
 * Run one free-conversation turn.
 *
 * @returns {Promise<{ text: string, cars: Array, quickReplies: string[]|null, contactActions: object|null, model: string, toolCalls: Array, seenCars: Array }>}
 */
export async function runChatAgent({
  message,
  conversationHistory = [],
  previousCars = [],
  fetchStoreInfo,
  fetchBanks,
  fetchSalesReps,
  buildContactActions,
  deadlineMs,
}) {
  const runtime = createChatToolRuntime({
    seedCars: previousCars,
    fetchStoreInfo,
    fetchBanks,
    fetchSalesReps,
  });

  // Tell the model which cards the customer is currently looking at, with the
  // same ref numbers the tools use, so "the second one" resolves for free.
  const seeded = runtime.seededCards();
  const seedNote = seeded.length
    ? `\n\n# السيارات المعروضة أمام العميل الآن (من ردك السابق)\n${seeded
        .map(
          (c) =>
            `ref ${c.ref}: ${c.make} ${c.model} ${c.year} — ${
              c.price ? `${c.price.toLocaleString("ar-SA")} ر.س` : "السعر غير محدد"
            }`
        )
        .join("\n")}\nيمكنك استخدام هذه الأرقام مباشرة في الأدوات.`
    : "";

  let loop;
  try {
    loop = await runGeminiToolLoop({
      systemInstruction: `${SYSTEM_INSTRUCTION}${seedNote}`,
      tools: CHAT_AGENT_TOOLS,
      history: buildGeminiHistory(conversationHistory),
      message: String(message || "").trim() || "مرحبا",
      executeTool: (name, args) => runtime.execute(name, args),
      maxSteps: 6,
      generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
      ...(deadlineMs ? { deadlineMs } : {}),
    });
  } catch (error) {
    // Out of time, or every model in the chain was unavailable. Anything the
    // tools already found beats handing the customer a bare error — that is
    // what the widget shows when this function throws.
    const found = runtime.getSeenCars().filter((car) => Number(car.price) > 0);
    logger.error("[chat-agent] turn failed", {
      deadline: isGeminiDeadlineError(error),
      message: error?.message?.slice?.(0, 200) || String(error),
      carsAlreadyFound: found.length,
    });

    return {
      text: found.length
        ? "المعذرة، تأخر ردي أكثر من المعتاد. هذه بعض الخيارات المتاحة الآن، وإن أردت تفاصيل أو قسطاً اسألني مرة أخرى أو تواصل مع فريقنا عبر الأزرار أدناه."
        : "المعذرة، الخدمة مزدحمة الآن ولم أستطع إكمال الرد. جرّب مرة أخرى بعد لحظات، أو تواصل مع فريقنا مباشرة عبر الأزرار أدناه.",
      cars: found.slice(0, 3),
      quickReplies: null,
      contactActions: await buildContactActions().catch(() => null),
      model: null,
      toolCalls: [],
      seenCars: runtime.getSeenCars(),
      failed: true,
    };
  }

  const { text, model, calls, steps } = loop;

  const cleanedText = sanitizeReply(text);
  logger.debug("[chat-agent] turn complete", {
    model,
    steps,
    tools: calls.map((c) => c.name),
    replyLength: cleanedText.length,
  });

  const clarifier = runtime.getClarifier();

  // The model normally picks the cards via show_cars. If it forgot but clearly
  // named cars it looked up, attach those rather than nothing.
  let cars = runtime.getShownCars();
  if (!cars.length && !clarifier) {
    cars = pickMentionedCars(runtime.getSeenCars(), cleanedText);
  }

  // A turn that asks "بنزين ولا هجين؟" must not also dump all six trims — that
  // is the pile-of-options the question exists to avoid. Only the cars the
  // model deliberately picked survive, and at most two of them as examples.
  if (clarifier) cars = cars.slice(0, 2);
  if (cars.length > 1) cars = orderCardsByMention(cars, cleanedText);

  let contactActions = null;
  const deadEnd = looksLikeDeadEndAnswer(cleanedText);
  if (runtime.wantsContactActions() || deadEnd) {
    contactActions = await buildContactActions().catch(() => null);
  }

  // An answer that says "we can't help" must not arrive carrying cards it
  // never mentioned.
  if (deadEnd) {
    cars = cars.filter((car) => carIsMentionedIn(car, cleanedText));
  }

  return {
    text: cleanedText,
    cars,
    quickReplies: clarifier?.options?.length ? clarifier.options : null,
    contactActions,
    model,
    toolCalls: calls,
    seenCars: runtime.getSeenCars(),
  };
}
