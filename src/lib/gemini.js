import { GoogleGenerativeAI } from "@google/generative-ai";

/** Stable alias — always points at Google's current flash model. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-flash-latest";

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API Key is not configured");
  }
  return new GoogleGenerativeAI(key);
}

export function getGeminiModel(generationConfig) {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    ...(generationConfig ? { generationConfig } : {}),
  });
}
