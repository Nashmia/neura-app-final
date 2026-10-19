import "server-only";
import type { HistoryTurn } from "@/lib/gemini";

/**
 * Meta Llama served by Groq (OpenAI-compatible API on Groq's LPU inference
 * chips, typically several hundred tokens per second). Same shape as
 * `runAssistantTurn` in lib/gemini.ts so the assistant route can swap to it
 * with ASSISTANT_MODEL_PROVIDER=groq. Needs GROQ_API_KEY (free tier at
 * console.groq.com).
 *
 * Model choice: GROQ_MODEL if set. Otherwise the app asks Groq which models
 * this key can use and picks the best available Llama, because Groq retires
 * model ids over time and a hard-coded one eventually returns 404.
 */
const REQUEST_TIMEOUT_MS = 15_000;
const PREFERRED = [/^llama-3\.3-70b/i, /llama-4.*maverick/i, /llama-4.*scout/i, /^llama.*70b/i, /^llama.*instant/i, /llama/i];
let resolved: { id: string; at: number } | null = null;

/** The model id last used (for the "Answered by" label). */
export function groqModel() {
  return process.env.GROQ_MODEL || resolved?.id || "Llama";
}

async function chooseModel(key: string): Promise<string> {
  if (process.env.GROQ_MODEL) return process.env.GROQ_MODEL;
  if (resolved && Date.now() - resolved.at < 60 * 60 * 1000) return resolved.id;
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Groq model list returned ${response.status}`);
  const data = (await response.json()) as { data?: { id: string; active?: boolean }[] };
  const ids = (data.data ?? []).filter((m) => m.active !== false).map((m) => m.id);
  // Only chat models: skip guard/safety and speech models.
  const chat = ids.filter((id) => /llama/i.test(id) && !/guard|whisper|tts|prompt/i.test(id));
  const pick = PREFERRED.map((re) => chat.find((id) => re.test(id))).find(Boolean);
  if (!pick) throw new Error(`No Llama chat model available on this Groq key (found: ${ids.slice(0, 8).join(", ")})`);
  resolved = { id: pick, at: Date.now() };
  return pick;
}

export async function runGroqTurn(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");

  const model = await chooseModel(key);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", content: turn.text })),
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 404) resolved = null; // model retired: choose again next time
      throw new Error(`Groq returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Groq returned no message.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}


/**
 * A small JSON task (the retrieval reranker) on Groq: same signature as
 * runJsonTask in lib/gemini.ts. The system prompt already states the JSON
 * shape; Groq's JSON mode guarantees a parsable object.
 */
export async function runGroqJsonTask<T>(systemInstruction: string, prompt: string, _responseSchema: object, timeoutMs = 8000): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");
  const model = await chooseModel(key);
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${systemInstruction}\nRespond with a single JSON object only.` },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Groq returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no JSON.");
  return JSON.parse(text) as T;
}
