/**
 * Detects when the production route (or the model settings it relies on) has changed since replica.ts
 * was written, so evaluation results are never silently measuring stale logic.
 *
 * Compares two regions of app/api/assistant/chat/route.ts against route-snapshot.txt:
 *   1. the `const TOP_K = …;` line (route.ts:36)
 *   2. from `const retrievalQuery = history` to the end of the systemInstruction template (route.ts:65-117)
 * Whitespace at line ends and CRLF/LF differences are ignored; anything else counts as drift.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const ROUTE = join(ROOT, "app/api/assistant/chat/route.ts");
const SNAPSHOT = join(__dirname, "route-snapshot.txt");

const toLines = (s: string) => s.replace(/\r\n/g, "\n").split("\n");
const normalise = (s: string) => toLines(s).map((l) => l.trimEnd()).join("\n").trim();

/** Pulls the two replicated regions out of the route source. Returns null if a marker can't be found. */
export function extractRouteRegions(src: string): string | null {
  const lines = toLines(src);
  const topK = lines.find((l) => /^const TOP_K = /.test(l.trim()));
  const start = lines.findIndex((l) => l.includes("const retrievalQuery = history"));
  const end = lines.findIndex((l, i) => i > start && l.includes("${patientContext}`;"));
  if (!topK || start < 0 || end < 0) return null;
  return [topK.trim(), "---", ...lines.slice(start, end + 1)].join("\n");
}

export type DriftResult = { ok: boolean; detail: string };

export function checkRouteDrift(): DriftResult {
  const current = extractRouteRegions(readFileSync(ROUTE, "utf8"));
  if (!current) return { ok: false, detail: "Could not find the replicated code in route.ts (markers missing) — the route was restructured; update replica.ts." };
  // Header lines starting with "# " document the snapshot and are not part of the comparison.
  const snapshot = toLines(readFileSync(SNAPSHOT, "utf8")).filter((l) => !l.startsWith("# ")).join("\n");
  if (normalise(current) === normalise(snapshot)) return { ok: true, detail: "route.ts retrieval/context code matches the snapshot replica.ts was built from." };
  const a = normalise(current).split("\n");
  const b = normalise(snapshot).split("\n");
  const firstDiff = a.findIndex((line, i) => line !== b[i]);
  return { ok: false, detail: `route.ts differs from the snapshot (first difference near replicated line ${firstDiff + 1}). Results may not reflect production; update replica.ts and route-snapshot.txt.` };
}

/** Reads the model names / temperature the evaluation relies on straight from production source. */
export function readModelSettings() {
  const gemini = readFileSync(join(ROOT, "lib/gemini.ts"), "utf8");
  const embeddings = readFileSync(join(ROOT, "lib/embeddings.ts"), "utf8");
  const pick = (src: string, re: RegExp) => src.match(re)?.[1] ?? "not found";
  const assistantBody = gemini.slice(gemini.indexOf("export async function runAssistantTurn"));
  return {
    generationModel: pick(gemini, /const ASSISTANT_MODEL = "([^"]+)"/),
    quotaFallbackModel: pick(gemini, /const FALLBACK_MODEL = "([^"]+)"/),
    assistantTemperature: Number(pick(assistantBody, /temperature:\s*([\d.]+)/)),
    embeddingModel: pick(embeddings, /const EMBEDDING_MODEL = "([^"]+)"/),
  };
}
