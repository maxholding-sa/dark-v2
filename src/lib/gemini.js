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

export function getGeminiModel(generationConfig, modelName = GEMINI_MODEL) {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: modelName,
    ...(generationConfig ? { generationConfig } : {}),
  });
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
  { generationConfig, modelChain, rounds = 2 } = {}
) {
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
      try {
        const model = getGeminiModel(generationConfig, modelName);
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
          const delayMs = retryDelayMs(error, round);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
  }

  throw lastError || new Error("Gemini generateContent failed");
}
