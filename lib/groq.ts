import "server-only";
import type { HistoryTurn } from "@/lib/gemini";

/**
 * Meta Llama served by Groq (OpenAI-compatible API on Groq's LPU inference
 * chips, typically several hundred tokens per second). Same shape as
 * `runAssistantTurn` in lib/gemini.ts so the assistant route can swap to it
 * with ASSISTANT_MODEL_PROVIDER=groq. Needs GROQ_API_KEY (free tier at
 * console.groq.com). GROQ_MODEL picks the Llama model.
 */
export const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 15_000;

export function groqModel() {
  return process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
}

export async function runGroqTurn(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: groqModel(),
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", content: turn.text })),
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Groq returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Groq returned no message.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
