/**
 * Guards that the evaluation measures production code. Since Phase 2 the route and the evaluation both
 * import lib/assistant-context.ts (no replica to drift), so this checks that the route still builds its
 * retrieval, prompt and sources through that shared module. If someone re-inlines that logic in the route,
 * the check fails and the report shows a DRIFT warning.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const ROUTE = join(ROOT, "app/api/assistant/chat/route.ts");
const SHARED = ["retrieve", "buildKnowledgeContext", "buildPatientContext", "buildSystemInstruction", "citedSources"];

export type DriftResult = { ok: boolean; detail: string };

export function checkRouteDrift(): DriftResult {
  const src = readFileSync(ROUTE, "utf8");
  const importsShared = /from "@\/lib\/assistant-context"/.test(src) && /from "@\/lib\/retrieval"/.test(src);
  const unused = SHARED.filter((name) => !new RegExp(`\\b${name}\\b[^]*\\b${name}\\b`).test(src)); // imported AND used
  if (!importsShared || unused.length) {
    return { ok: false, detail: `route.ts no longer uses lib/assistant-context.ts / lib/retrieval.ts for: ${importsShared ? unused.join(", ") : "anything"}. The evaluation may not reflect production.` };
  }
  return { ok: true, detail: "route.ts builds retrieval, prompt and sources with lib/retrieval.ts and lib/assistant-context.ts, which the evaluation imports directly." };
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
