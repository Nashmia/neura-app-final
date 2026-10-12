import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

// "gemini-flash-latest" is currently returning sustained 503 "high demand"
// errors for anything but trivial prompts (confirmed independent of Vercel —
// same failure calling directly). Pinning to the current model avoids it.
const QUIZ_MODEL = "gemini-3.8-flash";
const ASSISTANT_MODEL = "gemini-3.8-flash";

// The free Gemini tier caps gemini-3.8-flash at a very low requests-per-day
// quota (20/day at time of writing) — easily exhausted by normal use, not
// just testing. gemini-flash-lite-latest has its own separate quota, so on
// RESOURCE_EXHAUSTED we fail over to it once rather than surfacing a hard
// error to the caregiver. This is a stopgap for the free tier, not a fix —
// the real fix is enabling billing on the Gemini API key for production use.
const FALLBACK_MODEL = "gemini-flash-lite-latest";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (local) and to your Vercel project's Environment Variables (production)."
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** True for Gemini's "model currently experiencing high demand" 503s — worth a retry, unlike a bad request or auth failure. */
function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"code":503') || message.includes("UNAVAILABLE") || message.includes("high demand");
}

/** True for a daily/per-minute quota being exhausted — retrying the same model won't help, but a different model's separate quota might. */
function isQuotaExceeded(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"code":429') || message.includes("RESOURCE_EXHAUSTED");
}

/**
 * Gemini's free tier returns transient 503s under load fairly often — Google's
 * own error message calls these "usually temporary". Retry a couple of times
 * with a short backoff before giving up, so a brief spike doesn't surface as
 * a hard failure to the caregiver.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000 * (i + 1)));
    }
  }
  throw lastError;
}

/** Run `fn` against the primary model; on quota exhaustion, retry once against FALLBACK_MODEL. */
async function withQuotaFallback<T>(fn: (model: string) => Promise<T>, primaryModel: string): Promise<T> {
  try {
    return await withRetry(() => fn(primaryModel));
  } catch (error) {
    if (!isQuotaExceeded(error)) throw error;
    return await withRetry(() => fn(FALLBACK_MODEL));
  }
}

export type HistoryTurn = { role: "user" | "model"; text: string };

export type QuizTurn =
  | { type: "question"; message: string; questionNumber: number; total: number }
  | { type: "complete"; message: string; score: number; total: number; summary: string };

const quizResponseSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["question", "complete"] },
    message: { type: Type.STRING },
    questionNumber: { type: Type.INTEGER },
    total: { type: Type.INTEGER },
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
  },
  required: ["type", "message", "total"],
};

export async function runQuizTurn(systemInstruction: string, history: HistoryTurn[]): Promise<QuizTurn> {
  const ai = getClient();
  const contents = history.length ? history : [{ role: "user" as const, text: "Please begin the check-in." }];

  const response = await withQuotaFallback(
    (model) =>
      ai.models.generateContent({
        model,
        contents: contents.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: quizResponseSchema,
          temperature: 0.6,
        },
      }),
    QUIZ_MODEL
  );

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return JSON.parse(text) as QuizTurn;
}

export async function runAssistantTurn(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  const ai = getClient();

  const response = await withQuotaFallback(
    (model) =>
      ai.models.generateContent({
        model,
        contents: history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      }),
    ASSISTANT_MODEL
  );

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}
