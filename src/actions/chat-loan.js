"use server";

import { db } from "@/lib/prisma";
import {
  LOAN_CHAT_MODES,
  LOAN_OFFER_FIELD_ORDER,
  LOAN_SUBMIT_FIELD_ORDER,
  LOAN_OPTIONAL_FIELD_ORDER,
  ADMIN_CONTACT_FIELD_ORDER,
  MAX_DOWN_PAYMENT_PCT_CHAT,
  emptyLoanState,
  getNextMissingField,
  parseLoanFieldAnswer,
  buildFieldPromptPayload,
  FIELD_PROMPTS,
} from "@/lib/chat-loan-intake";
import {
  generateIslamicOffers,
  getCarPrice,
  serializeOffersForChat,
} from "@/lib/generate-islamic-offers";
import {
  appendChatMessages,
  updateChatConversationState,
} from "@/actions/chat-conversation";

function serializeCarForChat(car) {
  if (!car) return null;
  return {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    price: Number(car.price),
    bodyType: car.bodyType,
    fuelType: car.fuelType,
    transmission: car.transmission,
    images: car.images || [],
    featured: car.featured,
    insuranceSegment: car.insuranceSegment,
    category: car.category,
  };
}

async function loadCar(carId) {
  if (!carId) return null;
  return db.car.findUnique({ where: { id: carId } });
}

async function loadBanks() {
  return db.bank.findMany({ orderBy: { name: "asc" } });
}

function assistantReply(content, payload = {}) {
  return {
    success: true,
    message: content,
    cars: payload.cars || [],
    offers: payload.offers || [],
    fieldPrompt: payload.fieldPrompt || null,
    loanSubmitted: payload.loanSubmitted || null,
    mode: payload.mode,
    conversationId: payload.conversationId,
    payload,
  };
}

async function persistTurn(conversationId, userText, reply) {
  await appendChatMessages(conversationId, [
    ...(userText
      ? [{ role: "user", content: userText, payload: null }]
      : []),
    {
      role: "assistant",
      content: reply.message,
      payload: {
        cars: reply.cars || [],
        offers: reply.offers || [],
        fieldPrompt: reply.fieldPrompt || null,
        loanSubmitted: reply.loanSubmitted || null,
      },
    },
  ]);
}

function enrichFieldPrompt(fieldKey, loanState) {
  const base = buildFieldPromptPayload(fieldKey);
  if (!base) return null;
  if (fieldKey !== "downPayment") return base;

  const carPrice = Number(loanState?.carSummary?.price) || 0;
  if (carPrice <= 0) return base;

  const maxAllowed = Math.floor(carPrice * MAX_DOWN_PAYMENT_PCT_CHAT);
  return {
    ...base,
    question: `${base.question}\nسعر السيارة: ${carPrice.toLocaleString("en-US")} ر.س\nالحد الأقصى: ${maxAllowed.toLocaleString("en-US")} ر.س (45%)`,
  };
}

function nextOfferQuestion(loanState) {
  const key = getNextMissingField(loanState, LOAN_OFFER_FIELD_ORDER);
  if (!key) return null;
  return enrichFieldPrompt(key, loanState);
}

function nextContactQuestion(loanState) {
  const key = getNextMissingField(loanState, LOAN_SUBMIT_FIELD_ORDER);
  if (!key) return null;
  return buildFieldPromptPayload(key);
}

async function buildOffersReply(conversation, loanState) {
  const car = await loadCar(loanState.carId);
  if (!car) {
    return assistantReply(
      "لم أجد السيارة المحددة. اختر سيارة أخرى للمتابعة.",
      {
        mode: LOAN_CHAT_MODES.CAR_SELECT,
        conversationId: conversation.id,
      }
    );
  }

  if (getCarPrice(car, loanState.fields) <= 0) {
    return startAdminContactFlow(conversation, car);
  }

  const banks = await loadBanks();
  const formData = {
    ...loanState.fields,
    // If customer declined first payment, force 0.
    downPayment:
      loanState.fields?.wantsDownPayment === "no"
        ? "0"
        : String(loanState.fields?.downPayment ?? "0"),
    loanAmount: String(getCarPrice(car, loanState.fields)),
  };
  const result = generateIslamicOffers({ banks, formData, car });

  if (result.pricingBlocked) {
    return assistantReply(
      `تعذر حساب العروض حالياً:\n${result.pricingBlockReason}`,
      {
        mode: LOAN_CHAT_MODES.LOAN_INTAKE,
        conversationId: conversation.id,
        fieldPrompt: nextOfferQuestion(loanState),
      }
    );
  }

  const offers = serializeOffersForChat(result.offers);
  const nextState = { ...loanState, offers };
  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.OFFERS,
    loanState: nextState,
  });

  const top = offers.slice(0, 3);
  const summary = top
    .map(
      (o, i) =>
        `${i + 1}) ${o.bankName}: قسط ${Math.round(o.monthlyPayment).toLocaleString("en-US")} ر.س · دفعة أولى ${Math.round(o.downPayment).toLocaleString("en-US")}`
    )
    .join("\n");

  return assistantReply(
    `هذه العروض التمويلية لسيارة ${car.year} ${car.make} ${car.model} حسب بياناتك:\n\n${summary}\n\nاختر عرضاً من البطاقات بالأسفل للمتابعة وإكمال طلب التمويل.`,
    {
      offers,
      mode: LOAN_CHAT_MODES.OFFERS,
      conversationId: conversation.id,
    }
  );
}

export async function startLoanFlow(conversation, { cars = [], message } = {}) {
  const loanState = emptyLoanState();
  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.CAR_SELECT,
    loanState,
  });

  // Always ask first — only show cars if the customer already named one.
  const hasCustomerCars = Array.isArray(cars) && cars.length > 0;
  const reply = assistantReply(
    hasCustomerCars
      ? "تمام، هذه السيارات حسب وصفك.\nاختر السيارة التي تريد تمويلها بزر «موّل هذه السيارة»، أو اكتب ماركة/موديل آخر."
      : "حسناً، لنبدأ طلب التمويل 🚗\n\nأولاً: أخبرني عن السيارة التي تريدها (الماركة أو الموديل، مثل: كامري، لكزس، هايلكس...)\nبعدها سأعرض لك المتاح لتختار واحدة، ثم نكمل بيانات التمويل والعروض.",
    {
      cars: hasCustomerCars ? cars.map(serializeCarForChat).filter(Boolean) : [],
      mode: LOAN_CHAT_MODES.CAR_SELECT,
      conversationId: conversation.id,
    }
  );

  await persistTurn(conversation.id, message || null, reply);
  return reply;
}

function formatAdminContactLines(store) {
  if (!store) {
    return "يرجى التواصل مع إدارة ماكس موتورز عبر قنوات التواصل في الموقع.";
  }
  const lines = [
    store.phone && `📞 هاتف: ${store.phone}`,
    store.whatsapp && `💬 واتساب: ${store.whatsapp}`,
    store.email && `✉️ بريد: ${store.email}`,
  ].filter(Boolean);
  return lines.length
    ? lines.join("\n")
    : "يرجى التواصل مع إدارة ماكس موتورز عبر قنوات التواصل في الموقع.";
}

async function startAdminContactFlow(conversation, car, userText = null) {
  const store = await db.storeInfo.findFirst().catch(() => null);
  const loanState = {
    ...emptyLoanState(),
    ...(conversation.loanState || {}),
    carId: car.id,
    carSummary: serializeCarForChat(car),
    needsAdminPricing: true,
    fields: {
      ...(emptyLoanState().fields),
      ...(conversation.loanState?.fields || {}),
    },
    selectedOffer: null,
    offers: [],
  };

  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
    loanState,
  });

  const fieldPrompt = buildFieldPromptPayload("fullName");
  const reply = assistantReply(
    `تم اختيار ${car.year} ${car.make} ${car.model}.\nسعر هذه السيارة غير محدد حالياً (متوفر عند الطلب)، لذلك لا يمكن حساب عروض البنوك تلقائياً.\n\nللتسعير والتمويل يرجى التواصل مع الإدارة:\n${formatAdminContactLines(store)}\n\nأو اترك بياناتك الآن وسنتواصل معك:\n\n${fieldPrompt?.question || "ما هو الاسم الكامل؟"}`,
    {
      cars: [serializeCarForChat(car)],
      fieldPrompt,
      mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
      conversationId: conversation.id,
      adminContact: true,
    }
  );
  await persistTurn(
    conversation.id,
    userText || `اختيار سيارة بدون سعر: ${car.make} ${car.model}`,
    reply
  );
  return reply;
}

export async function selectCarForLoan(conversation, carId, userText = null) {
  const car = await loadCar(carId);
  if (!car) {
    const reply = assistantReply("عذراً، لم أجد هذه السيارة. جرّب اختياراً آخر.", {
      mode: LOAN_CHAT_MODES.CAR_SELECT,
      conversationId: conversation.id,
    });
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  const price = Number(car.price);
  if (!Number.isFinite(price) || price <= 0) {
    return startAdminContactFlow(conversation, car, userText);
  }

  const loanState = {
    ...emptyLoanState(),
    carId: car.id,
    carSummary: serializeCarForChat(car),
    needsAdminPricing: false,
    fields: {
      ...emptyLoanState().fields,
    },
    selectedOffer: null,
    offers: [],
  };

  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.LOAN_INTAKE,
    loanState,
  });

  const fieldPrompt = nextOfferQuestion(loanState);
  const reply = assistantReply(
    `تم اختيار ${car.year} ${car.make} ${car.model} بسعر ${price.toLocaleString("en-US")} ر.س.\nسأسألك أسئلة التمويل ثم أعرض لك عروض البنوك.\n\n${fieldPrompt?.question || ""}`,
    {
      cars: [serializeCarForChat(car)],
      fieldPrompt,
      mode: LOAN_CHAT_MODES.LOAN_INTAKE,
      conversationId: conversation.id,
    }
  );
  await persistTurn(conversation.id, userText || `اختيار سيارة: ${car.make} ${car.model}`, reply);
  return reply;
}

export async function showCarsForLoanSelection(conversation, cars, message) {
  const serialized = (cars || []).map(serializeCarForChat).filter(Boolean);
  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.CAR_SELECT,
    loanState: conversation.loanState || emptyLoanState(),
  });

  const reply = assistantReply(
    serialized.length
      ? `وجدت ${serialized.length} سيارة حسب طلبك.\nاختر السيارة التي تريد تمويلها بزر «موّل هذه السيارة»، أو اكتب وصفاً أدق.`
      : "لم أجد سيارات مطابقة حالياً.\nجرّب كتابة الماركة أو الموديل بشكل أوضح (مثال: تويوتا كامري، لكزس ES).",
    {
      cars: serialized,
      mode: LOAN_CHAT_MODES.CAR_SELECT,
      conversationId: conversation.id,
    }
  );
  await persistTurn(conversation.id, message, reply);
  return reply;
}

export async function selectOfferForLoan(conversation, offerId, userText = null) {
  const loanState = conversation.loanState || emptyLoanState();
  const offer = (loanState.offers || []).find((o) => String(o.id) === String(offerId));
  if (!offer) {
    const reply = assistantReply("لم أجد هذا العرض. اختر عرضاً من القائمة.", {
      offers: loanState.offers || [],
      mode: LOAN_CHAT_MODES.OFFERS,
      conversationId: conversation.id,
    });
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  const nextState = {
    ...loanState,
    selectedOffer: offer,
    fields: {
      ...loanState.fields,
      downPayment: String(Math.round(offer.downPayment || 0)),
    },
  };

  await updateChatConversationState(conversation.id, {
    mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
    loanState: nextState,
  });

  const fieldPrompt = nextContactQuestion(nextState);
  const reply = assistantReply(
    `تم اختيار عرض ${offer.bankName} بقسط شهري حوالي ${Math.round(offer.monthlyPayment).toLocaleString("en-US")} ر.س.\nلنكمل بيانات طلب التمويل:\n\n${fieldPrompt?.question || ""}`,
    {
      fieldPrompt,
      mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
      conversationId: conversation.id,
    }
  );
  await persistTurn(
    conversation.id,
    userText || `اختيار عرض: ${offer.bankName}`,
    reply
  );
  return reply;
}

async function submitAdminContactLead(conversation, loanState, message) {
  const car = await loadCar(loanState.carId);
  const f = loanState.fields;
  const carLabel = car
    ? `${car.year} ${car.make} ${car.model}`
    : "سيارة غير محددة";

  try {
    await db.contact.create({
      data: {
        name: f.fullName,
        email: f.email,
        subject: `طلب تمويل — سعر عند الطلب — ${carLabel}`,
        message: [
          "طلب تواصل من الشات بوت لحساب تمويل/تسعير.",
          `السيارة: ${carLabel}`,
          car?.id ? `معرف السيارة: ${car.id}` : null,
          `الجوال: +966${f.mobileNumber}`,
          "ملاحظة: سعر السيارة غير محدد (0) ويحتاج متابعة من الإدارة.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    await updateChatConversationState(conversation.id, {
      mode: LOAN_CHAT_MODES.SUBMITTED,
      loanState: { ...loanState, adminLeadSubmitted: true },
    });

    const store = await db.storeInfo.findFirst().catch(() => null);
    const reply = assistantReply(
      `تم إرسال بياناتك للإدارة بنجاح ✅\nسيتواصلون معك بخصوص تسعير وتمويل ${carLabel}.\n\nيمكنك أيضاً التواصل مباشرة:\n${formatAdminContactLines(store)}`,
      {
        mode: LOAN_CHAT_MODES.SUBMITTED,
        conversationId: conversation.id,
        loanSubmitted: { adminContact: true },
      }
    );
    await persistTurn(conversation.id, message, reply);
    return reply;
  } catch (error) {
    console.error("[chat-loan] admin contact submit failed", error);
    const reply = assistantReply(
      "تعذر حفظ طلب التواصل. حاول مرة أخرى أو تواصل مع الإدارة مباشرة عبر الموقع.",
      {
        mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
        conversationId: conversation.id,
        fieldPrompt: buildFieldPromptPayload(
          getNextMissingField(loanState, ADMIN_CONTACT_FIELD_ORDER) || "fullName"
        ),
      }
    );
    await persistTurn(conversation.id, message, reply);
    return reply;
  }
}

async function submitLoanFromChat(conversation, loanState) {
  const car = await loadCar(loanState.carId);
  const offer = loanState.selectedOffer;
  if (!car || !offer) {
    return assistantReply("بيانات الطلب غير مكتملة. ابدأ من اختيار السيارة والعرض مجدداً.", {
      mode: LOAN_CHAT_MODES.CAR_SELECT,
      conversationId: conversation.id,
    });
  }

  const f = loanState.fields;
  const downPaymentValue = Number(f.downPayment);
  const loanAmountValue = getCarPrice(car, f);

  try {
    const loanRequest = await db.loanRequest.create({
      data: {
        fullName: f.fullName,
        email: f.email,
        mobileNumber: `+966${f.mobileNumber}`,
        city: f.city,
        time: f.time,
        idNumber: f.idNumber,
        idImage: null,
        carMake: car.make,
        carModel: car.model,
        carCategory: car.category || null,
        carYear: car.year,
        birthDateType: f.birthDateType || "hijri",
        birthMonth: f.birthMonth,
        birthYear: f.birthYear,
        gender: f.gender,
        loanAmount: loanAmountValue,
        downPayment: Number.isFinite(downPaymentValue) ? downPaymentValue : 0,
        loanTerm: 5,
        termMonths: offer.termMonths ?? 60,
        downPaymentPct: offer.downPaymentPct ?? null,
        monthlyPayment: offer.monthlyPayment ?? null,
        baseInstallment: offer.baseInstallment ?? null,
        monthlyInsurance: offer.monthlyInsurance ?? null,
        interestRate: offer.interestRate ?? null,
        finalPayment: offer.lastMonthPayment ?? null,
        balloonPayment: offer.balloonPayment ?? null,
        balloonPaymentPct: offer.balloonPaymentPct ?? null,
        adminFees: offer.adminFees ?? null,
        totalInsurance: offer.totalInsurance ?? null,
        totalProfit: offer.totalProfit ?? null,
        totalPayment: offer.totalPayment ?? null,
        insuranceSegment: offer.insuranceSegment ?? car.insuranceSegment ?? null,
        offerSnapshot: offer,
        netSalary: f.netSalary ? Number(f.netSalary) : null,
        employerSector: f.employerSector || null,
        employer: f.employer || null,
        salaryTransferBankId: offer.bankId || null,
        hasRealEstateFinance: f.hasRealEstateFinance === "yes",
        hasCreditDefault: f.hasCreditDefault === "yes",
        totalMonthlyObligations: f.totalMonthlyObligations
          ? Number(f.totalMonthlyObligations)
          : null,
        additionalInfo: f.additionalInfo || "تم التقديم عبر الشات بوت",
        carId: car.id,
        status: "PENDING",
      },
    });

    const nextState = { ...loanState, loanRequestId: loanRequest.id };
    await updateChatConversationState(conversation.id, {
      mode: LOAN_CHAT_MODES.SUBMITTED,
      loanState: nextState,
    });

    return assistantReply(
      `تم إرسال طلب التمويل بنجاح ✅\nرقم الطلب: ${loanRequest.id}\nسيتواصل معك فريق ماكس موتورز قريباً.\nيمكنك بدء محادثة جديدة أو تصفح السيارات في أي وقت.`,
      {
        loanSubmitted: { id: loanRequest.id, status: loanRequest.status },
        mode: LOAN_CHAT_MODES.SUBMITTED,
        conversationId: conversation.id,
      }
    );
  } catch (error) {
    console.error("[chat-loan] submit failed", error);
    return assistantReply(
      "حدث خطأ أثناء إرسال طلب التمويل. حاول مرة أخرى أو أكمل الطلب من صفحة السيارة.",
      {
        mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
        conversationId: conversation.id,
        fieldPrompt: nextContactQuestion(loanState),
      }
    );
  }
}

export async function handleLoanChatTurn(conversation, message) {
  const mode = conversation.mode;
  let loanState = { ...emptyLoanState(), ...(conversation.loanState || {}) };

  if (mode === LOAN_CHAT_MODES.ADMIN_CONTACT) {
    const fieldKey = getNextMissingField(loanState, ADMIN_CONTACT_FIELD_ORDER);
    if (!fieldKey) {
      return submitAdminContactLead(conversation, loanState, message);
    }

    const parsed = parseLoanFieldAnswer(fieldKey, message);
    if (!parsed.ok) {
      const fieldPrompt = buildFieldPromptPayload(fieldKey);
      const reply = assistantReply(`${parsed.error}\n\n${FIELD_PROMPTS[fieldKey]?.question || ""}`, {
        fieldPrompt,
        mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
        conversationId: conversation.id,
      });
      await persistTurn(conversation.id, message, reply);
      return reply;
    }

    loanState = {
      ...loanState,
      fields: { ...loanState.fields, [fieldKey]: parsed.value },
    };
    await updateChatConversationState(conversation.id, {
      mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
      loanState,
    });

    const nextField = getNextMissingField(loanState, ADMIN_CONTACT_FIELD_ORDER);
    if (!nextField) {
      return submitAdminContactLead(conversation, loanState, message);
    }

    const fieldPrompt = buildFieldPromptPayload(nextField);
    const reply = assistantReply(`تم ✅\n\n${fieldPrompt.question}`, {
      fieldPrompt,
      mode: LOAN_CHAT_MODES.ADMIN_CONTACT,
      conversationId: conversation.id,
    });
    await persistTurn(conversation.id, message, reply);
    return reply;
  }

  if (mode === LOAN_CHAT_MODES.LOAN_INTAKE) {
    const fieldKey = getNextMissingField(loanState, LOAN_OFFER_FIELD_ORDER);
    if (!fieldKey) {
      const offersReply = await buildOffersReply(conversation, loanState);
      await persistTurn(conversation.id, message, offersReply);
      return offersReply;
    }

    const carPrice =
      Number(loanState.carSummary?.price) ||
      getCarPrice(await loadCar(loanState.carId), loanState.fields);
    const parsed = parseLoanFieldAnswer(fieldKey, message, { carPrice });
    if (!parsed.ok) {
      const fieldPrompt = enrichFieldPrompt(fieldKey, loanState);
      const reply = assistantReply(
        `${parsed.error}\n\n${fieldPrompt?.question || FIELD_PROMPTS[fieldKey]?.question || ""}`,
        {
          fieldPrompt,
          mode: LOAN_CHAT_MODES.LOAN_INTAKE,
          conversationId: conversation.id,
        }
      );
      await persistTurn(conversation.id, message, reply);
      return reply;
    }

    const nextFields = { ...loanState.fields, [fieldKey]: parsed.value };
    if (fieldKey === "wantsDownPayment") {
      if (parsed.value === "no") {
        nextFields.downPayment = "0";
      } else {
        nextFields.downPayment = "";
      }
    }

    loanState = {
      ...loanState,
      fields: nextFields,
    };
    await updateChatConversationState(conversation.id, {
      mode: LOAN_CHAT_MODES.LOAN_INTAKE,
      loanState,
    });

    const nextField = getNextMissingField(loanState, LOAN_OFFER_FIELD_ORDER);
    if (!nextField) {
      const offersReply = await buildOffersReply(
        { ...conversation, loanState },
        loanState
      );
      await persistTurn(conversation.id, message, offersReply);
      return offersReply;
    }

    const fieldPrompt = enrichFieldPrompt(nextField, loanState);
    const reply = assistantReply(`تم ✅\n\n${fieldPrompt.question}`, {
      fieldPrompt,
      mode: LOAN_CHAT_MODES.LOAN_INTAKE,
      conversationId: conversation.id,
    });
    await persistTurn(conversation.id, message, reply);
    return reply;
  }

  if (mode === LOAN_CHAT_MODES.OFFERS) {
    const reply = assistantReply(
      "اختر أحد عروض التمويل من البطاقات بالأسفل للمتابعة.",
      {
        offers: loanState.offers || [],
        mode: LOAN_CHAT_MODES.OFFERS,
        conversationId: conversation.id,
      }
    );
    await persistTurn(conversation.id, message, reply);
    return reply;
  }

  if (mode === LOAN_CHAT_MODES.CONTACT_INTAKE) {
    const fieldKey = getNextMissingField(loanState, LOAN_SUBMIT_FIELD_ORDER);
    if (!fieldKey) {
      const submitReply = await submitLoanFromChat(conversation, loanState);
      await persistTurn(conversation.id, message, submitReply);
      return submitReply;
    }

    const parsed = parseLoanFieldAnswer(fieldKey, message);
    if (!parsed.ok) {
      const fieldPrompt = buildFieldPromptPayload(fieldKey);
      const reply = assistantReply(`${parsed.error}\n\n${FIELD_PROMPTS[fieldKey]?.question || ""}`, {
        fieldPrompt,
        mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
        conversationId: conversation.id,
      });
      await persistTurn(conversation.id, message, reply);
      return reply;
    }

    loanState = {
      ...loanState,
      fields: { ...loanState.fields, [fieldKey]: parsed.value },
      optionalAsked: {
        ...(loanState.optionalAsked || {}),
        ...(LOAN_OPTIONAL_FIELD_ORDER.includes(fieldKey) ? { [fieldKey]: true } : {}),
      },
    };
    await updateChatConversationState(conversation.id, {
      mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
      loanState,
    });

    const nextField = getNextMissingField(loanState, LOAN_SUBMIT_FIELD_ORDER);
    if (!nextField) {
      const submitReply = await submitLoanFromChat(
        { ...conversation, loanState },
        loanState
      );
      await persistTurn(conversation.id, message, submitReply);
      return submitReply;
    }

    const fieldPrompt = buildFieldPromptPayload(nextField);
    const reply = assistantReply(`تم ✅\n\n${fieldPrompt.question}`, {
      fieldPrompt,
      mode: LOAN_CHAT_MODES.CONTACT_INTAKE,
      conversationId: conversation.id,
    });
    await persistTurn(conversation.id, message, reply);
    return reply;
  }

  if (mode === LOAN_CHAT_MODES.SUBMITTED) {
    const reply = assistantReply(
      "طلب التمويل مُرسل مسبقاً في هذه المحادثة. ابدأ محادثة جديدة إذا أردت طلباً آخر.",
      {
        loanSubmitted: { id: loanState.loanRequestId },
        mode: LOAN_CHAT_MODES.SUBMITTED,
        conversationId: conversation.id,
      }
    );
    await persistTurn(conversation.id, message, reply);
    return reply;
  }

  return null;
}
