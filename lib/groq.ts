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
 * this key can use and picks the best available open-weight chat model:
 * Llama first, then OpenAI's open-weight gpt-oss, then Qwen. Groq retires
 * model ids over time (it no longer serves Llama chat models), so a
 * hard-coded id eventually returns 404.
 */
const REQUEST_TIMEOUT_MS = 15_000;
const PREFERRED = [/llama-3\.3-70b/i, /llama-4.*maverick/i, /llama-4.*scout/i, /llama.*70b/i, /llama.*instant/i, /llama/i, /gpt-oss-120b/i, /gpt-oss/i, /qwen/i];
let resolved: { id: string; at: number } | null = null;

/** The model id last used (for the "Answered by" label). */
export function groqModel() {
  return process.env.GROQ_MODEL || resolved?.id || "Llama";
}

/** Reasoning models think before answering; keep that short and out of the reply. */
function reasoningOptions(model: string) {
  if (/gpt-oss/i.test(model)) return { reasoning_effort: "low" };
  return {};
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
  // Only general chat models: skip guard/safety, speech and voice models.
  const chat = ids.filter((id) => !/guard|safeguard|whisper|tts|orpheus|prompt|allam/i.test(id));
  const pick = PREFERRED.map((re) => chat.find((id) => re.test(id))).find(Boolean);
  if (!pick) throw new Error(`No suitable chat model on this Groq key (found: ${ids.slice(0, 10).join(", ")})`);
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
        max_tokens: 1500,
        ...reasoningOptions(model),
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
    // Some open models put their thinking in <think> tags; never show that to the caregiver.
    const text = data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
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
      max_tokens: 1500,
      ...reasoningOptions(model),
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
