"use server";

import { db } from "@/lib/prisma";
import { serializedCarsData } from "@/lib/helper";
import {
  COMPARE_CHAT_MODES,
  emptyCompareState,
  buildComparisonPayload,
  buildComparisonIntro,
  carLabel,
  isCompareState,
  parseChangeCompareSlot,
  parseCompareEntities,
} from "@/lib/chat-compare";
import { emptyLoanState } from "@/lib/chat-loan-intake";
import {
  appendChatMessages,
  updateChatConversationState,
} from "@/actions/chat-conversation";
import { searchCarsForChat } from "@/lib/chat-car-search";
import { parseBudgetFromQuery } from "@/lib/car-search";

function serializeCarForChat(car) {
  if (!car) return null;
  return {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    price: Number(car.price) || 0,
    bodyType: car.bodyType,
    fuelType: car.fuelType,
    transmission: car.transmission,
    driveType: car.driveType || null,
    color: car.color || null,
    seats: car.seats ?? null,
    mileage: car.mileage ?? null,
    description: car.description || null,
    category: car.category || null,
    images: car.images || [],
    featured: !!car.featured,
    isLuxury: !!car.isLuxury,
    isEconomic: !!car.isEconomic,
    isCommercial: !!car.isCommercial,
    insuranceSegment: car.insuranceSegment || null,
    testDriveAvailable:
      car.testDriveAvailable == null ? true : !!car.testDriveAvailable,
  };
}

async function loadCar(carId) {
  if (!carId) return null;
  const car = await db.car.findUnique({ where: { id: carId } });
  if (!car) return null;
  try {
    return serializedCarsData(car);
  } catch {
    return car;
  }
}

function assistantReply(content, payload = {}) {
  return {
    success: true,
    message: content,
    cars: payload.cars || [],
    offers: payload.offers || [],
    fieldPrompt: payload.fieldPrompt || null,
    loanSubmitted: payload.loanSubmitted || null,
    carSelectAction: payload.carSelectAction || null,
    comparison: payload.comparison || null,
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
        carSelectAction: reply.carSelectAction || null,
        comparison: reply.comparison || null,
      },
    },
  ]);
}

function getCompareState(conversation) {
  const state = conversation.loanState;
  if (isCompareState(state)) {
    return { ...emptyCompareState(), ...state };
  }
  return emptyCompareState();
}

function changeCompareButtons() {
  return {
    fieldKey: "change_compare_car",
    question: "هل تريد تغيير إحدى السيارتين؟",
    options: [
      { value: "تغيير السيارة الأولى", label: "تغيير السيارة الأولى" },
      { value: "تغيير السيارة الثانية", label: "تغيير السيارة الثانية" },
    ],
  };
}

/** Pick the best representative car from search hits (prefer priced + featured). */
function pickBestCar(cars = []) {
  if (!cars?.length) return null;
  const scored = [...cars].sort((a, b) => {
    const priceA = Number(a.price) || 0;
    const priceB = Number(b.price) || 0;
    const hasPriceA = priceA > 0 ? 1 : 0;
    const hasPriceB = priceB > 0 ? 1 : 0;
    if (hasPriceB !== hasPriceA) return hasPriceB - hasPriceA;
    if (!!b.featured !== !!a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    return priceA - priceB;
  });
  return serializeCarForChat(scored[0]);
}

/**
 * Try to resolve two named entities into inventory cars and finish immediately.
 */
export async function tryOneShotCompare(conversation, message) {
  const entities = parseCompareEntities(message);
  if (!entities) return null;

  const [carsA, carsB] = await Promise.all([
    searchCarsForChat(entities.a, []),
    searchCarsForChat(entities.b, []),
  ]);

  const car1 = pickBestCar(carsA);
  const car2 = pickBestCar(carsB);

  if (!car1 || !car2) return null;
  if (String(car1.id) === String(car2.id)) return null;

  return finishCompare(
    conversation,
    { ...emptyCompareState(), car1, car2, completed: false },
    message
  );
}

export async function startCompareFlow(conversation, { message } = {}) {
  // One-shot: "قارن لكزس وكامري" → compare table immediately
  if (message) {
    const oneShot = await tryOneShotCompare(conversation, message);
    if (oneShot) return oneShot;
  }

  const budget = parseBudgetFromQuery(message || "");
  let starterCars = [];
  if (budget.maxPrice != null || budget.minPrice != null) {
    starterCars = (await searchCarsForChat(message || "", []))
      .slice(0, 8)
      .map(serializeCarForChat)
      .filter(Boolean);
  }

  await updateChatConversationState(conversation.id, {
    mode: COMPARE_CHAT_MODES.SELECT_1,
    loanState: emptyCompareState(),
  });

  const budgetHint =
    budget.maxPrice != null
      ? `\n(ميزانية حتى ${Number(budget.maxPrice).toLocaleString("en-US")} ر.س)`
      : "";

  const reply = assistantReply(
    starterCars.length
      ? `تمام، لنقارن بين سيارتين.${budgetHint}\n\nاختر **السيارة الأولى** من الخيارات، أو اكتب الماركة/الموديل (مثال: تويوتا، كامري، برادو).`
      : `تمام، لنقارن بين سيارتين.\n\nما هي **السيارة الأولى**؟\nاكتب الماركة أو الموديل (مثال: تويوتا، لكزس، كامري، برادو).\nأو اكتب الاثنتين معاً مثل: «قارن لي بين برادو ولاندكروزر»`,
    {
      cars: starterCars,
      mode: COMPARE_CHAT_MODES.SELECT_1,
      conversationId: conversation.id,
      carSelectAction: "compare",
    }
  );

  await persistTurn(conversation.id, message || null, reply);
  return reply;
}

/**
 * Re-open selection for car 1 or car 2 while keeping the other car when possible.
 */
export async function startChangeCompareSlot(conversation, slot, userText = null) {
  const state = getCompareState(conversation);

  if (slot === "ask") {
    const reply = assistantReply(
      "أي سيارة تريد تغييرها؟",
      {
        mode: conversation.mode,
        conversationId: conversation.id,
        fieldPrompt: changeCompareButtons(),
        cars: [state.car1, state.car2].filter(Boolean),
        carSelectAction: "none",
      }
    );
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  if (slot === 1) {
    const nextState = {
      ...emptyCompareState(),
      car1: null,
      car2: state.car2 || null,
      completed: false,
    };
    await updateChatConversationState(conversation.id, {
      mode: COMPARE_CHAT_MODES.SELECT_1,
      loanState: nextState,
    });

    const kept = nextState.car2
      ? `\n(سنبقي الثانية: **${carLabel(nextState.car2)}** ثم نحدّث المقارنة)`
      : "";

    const reply = assistantReply(
      `حسناً، لنغيّر **السيارة الأولى**.${kept}\n\nاكتب الماركة أو الموديل للسيارة الجديدة، أو اختر من النتائج.`,
      {
        cars: nextState.car2 ? [nextState.car2] : [],
        mode: COMPARE_CHAT_MODES.SELECT_1,
        conversationId: conversation.id,
        carSelectAction: nextState.car2 ? "none" : "compare",
      }
    );
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  if (slot === 2) {
    if (!state.car1) {
      return startCompareFlow(conversation, {
        message: userText || "تغيير السيارة الثانية",
      });
    }

    const nextState = {
      ...emptyCompareState(),
      car1: state.car1,
      car2: null,
      completed: false,
    };
    await updateChatConversationState(conversation.id, {
      mode: COMPARE_CHAT_MODES.SELECT_2,
      loanState: nextState,
    });

    const reply = assistantReply(
      `حسناً، لنغيّر **السيارة الثانية**.\nالأولى حالياً: **${carLabel(state.car1)}** ✅\n\nاكتب الماركة أو الموديل للسيارة الثانية الجديدة.`,
      {
        cars: [state.car1],
        mode: COMPARE_CHAT_MODES.SELECT_2,
        conversationId: conversation.id,
        carSelectAction: "none",
      }
    );
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  return null;
}

/**
 * Handle change-car phrases from idle (after a finished compare) or active compare modes.
 */
export async function handleChangeCompareRequest(conversation, message) {
  const slot = parseChangeCompareSlot(message);
  if (!slot) return null;

  const state = getCompareState(conversation);
  const hasCompareMemory =
    isCompareModeActive(conversation.mode) ||
    (state.completed && (state.car1 || state.car2));

  if (!hasCompareMemory && !state.car1 && !state.car2) {
    // No prior compare — start fresh
    return startCompareFlow(conversation, { message });
  }

  return startChangeCompareSlot(conversation, slot, message);
}

function isCompareModeActive(mode) {
  return mode === COMPARE_CHAT_MODES.SELECT_1 || mode === COMPARE_CHAT_MODES.SELECT_2;
}

export async function showCarsForCompareSelection(conversation, cars, message) {
  const state = getCompareState(conversation);
  const mode = conversation.mode;
  const serialized = (cars || []).map(serializeCarForChat).filter(Boolean);
  const which =
    mode === COMPARE_CHAT_MODES.SELECT_2 ? "الثانية" : "الأولى";

  await updateChatConversationState(conversation.id, {
    mode,
    loanState: { ...state, completed: false },
  });

  const reply = assistantReply(
    serialized.length
      ? `وجدت ${serialized.length} سيارة.\nاختر السيارة **${which}** بزر «اختر للمقارنة»، أو اكتب وصفاً أدق.`
      : `لم أجد تطابقاً واضحاً للسيارة **${which}** في المخزون الحالي.\nجرّب الماركة أو الموديل كما في الموقع (عربي أو إنجليزي)، مثال: تويوتا كامري / Camry.`,
    {
      cars: serialized,
      mode,
      conversationId: conversation.id,
      carSelectAction: "compare",
    }
  );

  await persistTurn(conversation.id, message, reply);
  return reply;
}

async function finishCompare(conversation, state, userText) {
  const full1 = (await loadCar(state.car1?.id)) || state.car1;
  const full2 = (await loadCar(state.car2?.id)) || state.car2;
  const car1 = serializeCarForChat(full1);
  const car2 = serializeCarForChat(full2);

  const comparison = buildComparisonPayload(car1, car2);
  const message = [
    buildComparisonIntro(car1, car2),
    "",
    "يمكنك فتح بطاقة أي سيارة للتفاصيل، أو اكتب «موّل» لبدء التمويل.",
  ].join("\n");

  // Keep both cars in state so the user can change either one later
  await updateChatConversationState(conversation.id, {
    mode: "idle",
    loanState: {
      flow: "compare",
      car1,
      car2,
      completed: true,
    },
  });

  const reply = assistantReply(message, {
    cars: [car1, car2].filter(Boolean),
    comparison,
    fieldPrompt: changeCompareButtons(),
    mode: "idle",
    conversationId: conversation.id,
    carSelectAction: null,
  });

  await persistTurn(
    conversation.id,
    userText || `مقارنة: ${carLabel(car1)} vs ${carLabel(car2)}`,
    reply
  );
  return reply;
}

export async function selectCarForCompare(conversation, carId, userText = null) {
  const car = await loadCar(carId);
  const mode = conversation.mode;
  const state = getCompareState(conversation);

  if (!car) {
    const reply = assistantReply("عذراً، لم أجد هذه السيارة. جرّب اختياراً آخر.", {
      mode,
      conversationId: conversation.id,
      carSelectAction: "compare",
    });
    await persistTurn(conversation.id, userText, reply);
    return reply;
  }

  const summary = serializeCarForChat(car);

  if (mode === COMPARE_CHAT_MODES.SELECT_1) {
    // Changing first car while second is already kept → refresh comparison
    if (state.car2?.id && String(state.car2.id) !== String(summary.id)) {
      const nextState = {
        ...state,
        car1: summary,
        car2: state.car2,
        completed: false,
      };
      return finishCompare(conversation, nextState, userText);
    }

    if (state.car2?.id && String(state.car2.id) === String(summary.id)) {
      const reply = assistantReply(
        "هذه هي نفس السيارة الثانية. الرجاء اختيار **سيارة أولى مختلفة**.",
        {
          cars: [],
          mode: COMPARE_CHAT_MODES.SELECT_1,
          conversationId: conversation.id,
          carSelectAction: "compare",
        }
      );
      await persistTurn(conversation.id, userText, reply);
      return reply;
    }

    const nextState = { ...state, car1: summary, car2: null, completed: false };
    await updateChatConversationState(conversation.id, {
      mode: COMPARE_CHAT_MODES.SELECT_2,
      loanState: nextState,
    });

    const reply = assistantReply(
      `تم اختيار الأولى: **${carLabel(summary)}** ✅\n\nالآن: ما هي **السيارة الثانية** للمقارنة؟\nاكتب الماركة أو الموديل.\n(يمكنك لاحقاً كتابة «تغيير السيارة الأولى» لتعديلها)`,
      {
        cars: [summary],
        mode: COMPARE_CHAT_MODES.SELECT_2,
        conversationId: conversation.id,
        carSelectAction: "none",
        fieldPrompt: {
          fieldKey: "change_compare_car",
          question: null,
          options: [
            { value: "تغيير السيارة الأولى", label: "تغيير السيارة الأولى" },
          ],
        },
      }
    );
    await persistTurn(
      conversation.id,
      userText || `اختيار السيارة الأولى: ${carLabel(summary)}`,
      reply
    );
    return reply;
  }

  if (mode === COMPARE_CHAT_MODES.SELECT_2) {
    if (state.car1?.id && String(state.car1.id) === String(summary.id)) {
      const reply = assistantReply(
        "اخترت نفس السيارة الأولى. الرجاء اختيار **سيارة مختلفة** للمقارنة.\nأو اضغط «تغيير السيارة الأولى» إذا أردت استبدالها.",
        {
          cars: [],
          mode: COMPARE_CHAT_MODES.SELECT_2,
          conversationId: conversation.id,
          carSelectAction: "compare",
          fieldPrompt: {
            fieldKey: "change_compare_car",
            question: null,
            options: [
              { value: "تغيير السيارة الأولى", label: "تغيير السيارة الأولى" },
            ],
          },
        }
      );
      await persistTurn(conversation.id, userText, reply);
      return reply;
    }

    const nextState = { ...state, car2: summary, completed: false };
    return finishCompare(conversation, nextState, userText);
  }

  return null;
}

export async function handleCompareCarSearch(
  conversation,
  matchedCars,
  message
) {
  if (parseChangeCompareSlot(message)) {
    return handleChangeCompareRequest(conversation, message);
  }

  const cars = (matchedCars || []).map(serializeCarForChat).filter(Boolean);

  if (cars.length === 1) {
    return selectCarForCompare(conversation, cars[0].id, message);
  }

  return showCarsForCompareSelection(conversation, cars, message);
}
