import { GoogleGenerativeAI } from "@google/generative-ai";

/** Primary model — override with GEMINI_MODEL. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash";

/**
 * Fallback chain when the primary returns 503/429.
 * Override with GEMINI_FALLBACK_MODELS=model-a,model-b
 * (comma-separated). Defaults diversify across flash / lite pools.
 */
function parseFallbackModels() {
  const fromEnv = String(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;

  const single = String(process.env.GEMINI_FALLBACK_MODEL || "").trim();
  if (single) return [single];

  return [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ];
}

export function getGeminiModelChain() {
  const seen = new Set();
  const chain = [];
  for (const name of [GEMINI_MODEL, ...parseFallbackModels()]) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    chain.push(name);
  }
  return chain;
}

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API Key is not configured");
  }
  return new GoogleGenerativeAI(key);
}

export function getGeminiModel(
  generationConfig,
  modelName = GEMINI_MODEL,
  requestOptions
) {
  const client = getGeminiClient();
  return client.getGenerativeModel(
    {
      model: modelName,
      ...(generationConfig ? { generationConfig } : {}),
    },
    requestOptions
  );
}

/**
 * A chat reply that arrives after the reverse proxy has given up is worse than
 * no reply: the server action rejects and the widget shows a bare "حدث خطأ".
 * Every entry point below is bounded so we always return something in time.
 */
export const GEMINI_TURN_DEADLINE_MS = Number(
  process.env.GEMINI_TURN_DEADLINE_MS || 24000
);
export const GEMINI_REQUEST_TIMEOUT_MS = Number(
  process.env.GEMINI_REQUEST_TIMEOUT_MS || 12000
);

export class GeminiDeadlineError extends Error {
  constructor(message = "Gemini turn exceeded its deadline") {
    super(message);
    this.name = "GeminiDeadlineError";
    this.isDeadline = true;
  }
}

export function isGeminiDeadlineError(error) {
  return Boolean(error?.isDeadline) || error?.name === "GeminiDeadlineError";
}

/** Budget for one HTTP call: never more than what is left of the turn. */
function callTimeout(remainingMs) {
  return Math.max(2000, Math.min(GEMINI_REQUEST_TIMEOUT_MS, remainingMs));
}

export function isTransientGeminiError(error) {
  const message = String(error?.message || "");
  const status = error?.status;
  return (
    status === 503 ||
    status === 429 ||
    // Retired / unknown model IDs — skip to next in the chain
    status === 404 ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("404") ||
    /Service Unavailable|Too Many Requests|high demand|overloaded|quota|not found|is not found/i.test(
      message
    )
  );
}

function retryDelayMs(error, attempt) {
  const suggested = Number(String(error?.message || "").match(/retry in ([\d.]+)s/i)?.[1]);
  if (Number.isFinite(suggested)) {
    // Cap suggested delay — we prefer switching models over long waits
    return Math.min(Math.ceil(suggested * 1000) + 150, 2500);
  }
  return Math.min(400 * 2 ** attempt, 2000);
}

/**
 * generateContent with automatic model failover on 503/429.
 * Tries the next model immediately instead of hammering the same overloaded pool.
 *
 * @returns {{ result: import("@google/generative-ai").GenerateContentResult, model: string, text: string }}
 */
export async function generateContentResilient(
  promptOrParts,
  {
    generationConfig,
    modelChain,
    rounds = 2,
    deadlineMs = GEMINI_TURN_DEADLINE_MS,
  } = {}
) {
  const startedAt = Date.now();
  const remaining = () => deadlineMs - (Date.now() - startedAt);
  const models = (modelChain?.length ? modelChain : getGeminiModelChain()).filter(
    Boolean
  );
  if (!models.length) {
    throw new Error("No Gemini models configured");
  }

  let lastError;
  let attempt = 0;

  for (let round = 0; round < rounds; round += 1) {
    for (const modelName of models) {
      attempt += 1;
      if (remaining() <= 0) {
        throw lastError || new GeminiDeadlineError();
      }
      try {
        const model = getGeminiModel(generationConfig, modelName, {
          timeout: callTimeout(remaining()),
        });
        const result = await model.generateContent(promptOrParts);
        const text = result?.response?.text?.() ?? "";
        if (attempt > 1) {
          console.info("[gemini] recovered with fallback model", {
            model: modelName,
            attempt,
            round: round + 1,
          });
        }
        return { result, model: modelName, text };
      } catch (error) {
        lastError = error;
        const transient = isTransientGeminiError(error);
        console.error("[gemini] generateContent failed", {
          model: modelName,
          attempt,
          round: round + 1,
          transient,
          message: error?.message?.slice?.(0, 220) || String(error),
        });

        if (!transient) throw error;

        // Same-round: move to next model immediately (no sleep).
        // Between rounds: short backoff once the whole chain failed.
        const isLastInRound = modelName === models[models.length - 1];
        if (isLastInRound && round < rounds - 1) {
          const delayMs = Math.min(retryDelayMs(error, round), Math.max(0, remaining()));
          if (delayMs <= 0) break;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
  }

  throw lastError || new Error("Gemini generateContent failed");
}

/**
 * Agentic tool-calling loop with the same model failover as
 * generateContentResilient.
 *
 * The model decides which tools to call and when to stop; we execute the calls
 * and feed the results back until it produces a final text answer. Because
 * every tool here is read-only, a transient failure mid-loop can simply be
 * replayed against the next model in the chain.
 *
 * @param {object} params
 * @param {string} params.systemInstruction
 * @param {Array}  params.tools           functionDeclarations, Gemini format
 * @param {Array}  params.history         [{ role: "user"|"model", parts: [{text}] }]
 * @param {string} params.message         current user turn
 * @param {(name: string, args: object) => Promise<object>} params.executeTool
 * @param {number} [params.maxSteps]      max tool rounds before forcing an answer
 * @returns {Promise<{ text: string, model: string, steps: number, calls: Array }>}
 */
/** Sticky pick of the model that last answered, to skip dead pools. */
let lastGoodToolModel = null;

export async function runGeminiToolLoop({
  systemInstruction,
  tools,
  history = [],
  message,
  executeTool,
  maxSteps = 5,
  generationConfig,
  modelChain,
  rounds = 2,
  deadlineMs = GEMINI_TURN_DEADLINE_MS,
}) {
  const models = (modelChain?.length ? modelChain : getGeminiModelChain()).filter(
    Boolean
  );
  if (!models.length) throw new Error("No Gemini models configured");

  const startedAt = Date.now();
  const remaining = () => deadlineMs - (Date.now() - startedAt);

  const buildModel = (modelName, withTools = true) =>
    getGeminiClient().getGenerativeModel(
      {
        model: modelName,
        systemInstruction,
        tools:
          withTools && tools?.length ? [{ functionDeclarations: tools }] : undefined,
        ...(generationConfig ? { generationConfig } : {}),
      },
      { timeout: callTimeout(remaining()) }
    );

  // Failover happens per request, not per loop: an overloaded model mid-turn
  // must not cost us the tool calls we already paid for. Start on whichever
  // model answered last so a quota-blocked primary is not re-probed on every
  // single turn.
  const remembered = models.indexOf(lastGoodToolModel);
  let activeIndex = remembered >= 0 ? remembered : 0;
  let usedModel = models[activeIndex];

  const generate = async (contents, { withTools = true } = {}) => {
    let lastError;
    for (let round = 0; round < rounds; round += 1) {
      for (let offset = 0; offset < models.length; offset += 1) {
        if (remaining() <= 0) {
          throw lastError || new GeminiDeadlineError();
        }
        const index = (activeIndex + offset) % models.length;
        const modelName = models[index];
        try {
          const result = await buildModel(modelName, withTools).generateContent({
            contents,
          });
          if (modelName !== usedModel) {
            console.info("[gemini] tool loop switched model", { model: modelName });
          }
          activeIndex = index;
          usedModel = modelName;
          lastGoodToolModel = modelName;
          return result;
        } catch (error) {
          lastError = error;
          if (!isTransientGeminiError(error)) throw error;
          console.error("[gemini] tool loop request failed", {
            model: modelName,
            round: round + 1,
            message: error?.message?.slice?.(0, 200) || String(error),
          });
        }
      }
      if (round < rounds - 1) {
        const delayMs = Math.min(retryDelayMs(lastError, round), Math.max(0, remaining()));
        if (delayMs <= 0) break;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError || new Error("Gemini generateContent failed");
  };

  // The SDK's ChatSession tags tool results with role "function", which newer
  // Gemini models reject outright, so the contents array is managed by hand.
  const contents = [...history, { role: "user", parts: [{ text: message }] }];
  const calls = [];
  let result = await generate(contents);
  let steps = 0;

  // Reserve enough of the budget to still write the answer after the last
  // lookup — a turn that spends everything on tools returns nothing.
  const ANSWER_RESERVE_MS = 6000;

  while (steps < maxSteps) {
    const requested = result?.response?.functionCalls?.() || [];
    if (!requested.length) break;
    if (remaining() < ANSWER_RESERVE_MS) {
      console.warn("[gemini] tool loop stopping early to answer in time", {
        steps,
        remainingMs: remaining(),
      });
      break;
    }

    const modelParts = result?.response?.candidates?.[0]?.content?.parts;
    if (!modelParts?.length) break;

    steps += 1;
    contents.push({ role: "model", parts: modelParts });

    const responses = [];
    for (const call of requested) {
      let payload;
      try {
        payload = await executeTool(call.name, call.args || {});
      } catch (error) {
        payload = { error: error?.message || "tool failed" };
      }
      calls.push({ name: call.name, args: call.args || {} });
      responses.push({
        functionResponse: {
          ...(call.id ? { id: call.id } : {}),
          name: call.name,
          // Gemini requires an object here, never a bare array/scalar
          response:
            payload && typeof payload === "object" ? payload : { value: payload },
        },
      });
    }

    contents.push({ role: "user", parts: responses });
    result = await generate(contents);
  }

  let text = result?.response?.text?.() ?? "";

  // Ran out of steps or time while still calling tools, so the turn has no
  // prose yet. Re-ask with the tools detached — leaving them attached is what
  // produced an endless chain of lookups and an empty reply. The unanswered
  // functionCall turn stays out of `contents`: a call without a response is
  // rejected.
  //
  // Only safe once at least one tool has actually returned. With no results in
  // `contents`, "answer without tools" is an invitation to invent cars and
  // prices — so an empty-handed turn fails loudly instead and the caller
  // degrades gracefully.
  if (!text.trim()) {
    if (!calls.length) {
      throw new GeminiDeadlineError(
        "Gemini turn ended before any tool returned data"
      );
    }
    contents.push({
      role: "user",
      parts: [
        {
          text: "اكتب الآن الإجابة النهائية للعميل بالنص فقط. اعتمد حصراً على نتائج الأدوات الواردة أعلاه، ولا تذكر أي سيارة أو سعر أو رقم لم يرد فيها. لا تستدعِ أي أداة.",
        },
      ],
    });
    text = (await generate(contents, { withTools: false }))?.response?.text?.() ?? "";
  }

  return { text, model: usedModel, steps, calls };
}
