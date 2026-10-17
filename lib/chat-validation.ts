import type { HistoryTurn } from "@/lib/gemini";

/**
 * Server-side checks on the conversation history a client sends to the AI routes, so oversized or
 * malformed input is rejected with a clear error instead of being passed to the model.
 */

/** Only the newest turns are kept; retrieval uses the last 4 and older context adds cost, not quality. */
export const MAX_TURNS = 12;
export const MAX_USER_TURN_CHARS = 2000;
export const MAX_MODEL_TURN_CHARS = 6000;
export const MAX_BODY_BYTES = 64 * 1024;

export type Failure = { ok: false; status: 400 | 413; error: string };
export type HistoryResult = { ok: true; history: HistoryTurn[]; truncated: boolean } | Failure;

/** Reads a JSON body, refusing anything over `maxBytes` before parsing it. */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<{ ok: true; data: unknown } | Failure> {
  const tooLarge: Failure = { ok: false, status: 413, error: "That message is too long. Please shorten it and try again." };
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) return tooLarge;
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid request." };
  }
}

/**
 * Validates and caps a conversation: turns must be {role, text} with non-empty text, start with the
 * user, strictly alternate, and end with the user. Each turn has a length limit. Conversations longer
 * than MAX_TURNS are trimmed to the newest turns (still starting with a user turn) rather than rejected,
 * so a long chat keeps working.
 */
export function validateHistory(raw: unknown): HistoryResult {
  const invalid = (error: string): Failure => ({ ok: false, status: 400, error });
  if (!Array.isArray(raw) || raw.length === 0) return invalid("Invalid request.");

  const history: HistoryTurn[] = [];
  for (const turn of raw) {
    if (!turn || typeof turn !== "object") return invalid("Invalid request.");
    const { role, text } = turn as Record<string, unknown>;
    if ((role !== "user" && role !== "model") || typeof text !== "string" || !text.trim()) return invalid("Invalid request.");
    const limit = role === "user" ? MAX_USER_TURN_CHARS : MAX_MODEL_TURN_CHARS;
    if (text.length > limit) {
      return { ok: false, status: 413, error: role === "user" ? `Please keep messages under ${MAX_USER_TURN_CHARS} characters.` : "The conversation is too long. Please start a new chat." };
    }
    history.push({ role, text });
  }

  if (history[0].role !== "user") return invalid("The conversation must start with a message from the caregiver.");
  for (let i = 1; i < history.length; i++) {
    if (history[i].role === history[i - 1].role) return invalid("Invalid conversation order.");
  }
  if (history[history.length - 1].role !== "user") return invalid("The last message must be from the caregiver.");

  if (history.length <= MAX_TURNS) return { ok: true, history, truncated: false };
  let kept = history.slice(-MAX_TURNS);
  if (kept[0].role !== "user") kept = kept.slice(1);
  return { ok: true, history: kept, truncated: true };
}
