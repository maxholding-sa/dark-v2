import OpenAI from "openai";

/** Default chat model — override with OPENAI_MODEL. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** Keep replies short so latency stays low. */
export const OPENAI_CHAT_MAX_TOKENS = Number(process.env.OPENAI_CHAT_MAX_TOKENS || 450);

let client = null;

export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OpenAI API Key is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

/**
 * Single-turn text generation (system + user), mirroring Gemini generateContent.
 * @param {object} options
 * @param {string} [options.system]
 * @param {string} options.user
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @returns {Promise<string>}
 */
export async function generateOpenAIText({
  system,
  user,
  model = OPENAI_MODEL,
  temperature = 0.35,
  maxTokens = OPENAI_CHAT_MAX_TOKENS,
} = {}) {
  const openai = getOpenAIClient();
  const messages = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: user || "" });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}
