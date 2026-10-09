import "server-only";
import type { HistoryTurn } from "@/lib/gemini";

const REQUEST_TIMEOUT_MS = 25_000; // free HF Spaces can be slow to wake from sleep

/**
 * Calls the fine-tuned model hosted on Hugging Face (see training/hf_space).
 * Same shape as `runAssistantTurn` in lib/gemini.ts, so the assistant route
 * can swap between the two behind the ASSISTANT_MODEL_PROVIDER env var.
 */
export async function runFinetunedTurn(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  const baseUrl = process.env.HF_SPACE_URL;
  if (!baseUrl) throw new Error("HF_SPACE_URL is not set — cannot reach the fine-tuned model.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HF_SPACE_TOKEN ? { Authorization: `Bearer ${process.env.HF_SPACE_TOKEN}` } : {}),
      },
      body: JSON.stringify({ system: systemInstruction, history }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Fine-tuned model endpoint returned ${response.status}`);
    const data = (await response.json()) as { message?: string };
    if (!data.message) throw new Error("Fine-tuned model endpoint returned no message.");
    return data.message;
  } finally {
    clearTimeout(timeout);
  }
}
