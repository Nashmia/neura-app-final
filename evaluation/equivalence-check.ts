/**
 * Behavioural drift check (no API calls).
 *
 * Pulls the replicated region straight out of the CURRENT app/api/assistant/chat/route.ts, runs it with
 * the fixture data and a fake deterministic embedder, and checks that replica.ts produces byte-identical
 * retrieval query, top-K chunks, knowledge context, patient context and system prompt for every test case.
 * That region is plain JavaScript (no type annotations), so it can be executed as-is.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractRouteRegions } from "./drift-check";
import * as replica from "./replica";
import type { TestCase } from "./test-cases";

type Fixture = Parameters<typeof replica.buildPatientContext>[0];

/** Deterministic pseudo-embedding from text, so ranking is stable without calling Gemini. */
function fakeEmbed(text: string, dims = 64): number[] {
  let h = 2166136261;
  const out: number[] = [];
  for (let i = 0; i < dims; i++) {
    for (const ch of `${i}:${text}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    out.push(((h >>> 0) % 2000) / 1000 - 1);
  }
  return out;
}

export async function checkReplicaEquivalence(
  fixture: Fixture,
  cases: TestCase[],
  cosineSimilarity: (a: number[], b: number[]) => number
): Promise<{ ok: boolean; detail: string }> {
  const region = extractRouteRegions(readFileSync(join(__dirname, "..", "app/api/assistant/chat/route.ts"), "utf8"));
  if (!region) return { ok: false, detail: "Route markers not found; cannot run the behavioural check." };
  const [topKLine, , ...body] = region.split("\n");
  const code = `${topKLine}\n${body.join("\n")}\nreturn { retrievalQuery, topChunks, knowledgeContext, patientContext, systemInstruction };`;

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const runRoute = new AsyncFunction("history", "chunks", "patient", "medications", "sessions", "journalEntries", "appointments", "embedText", "cosineSimilarity", code);

  const chunks: replica.Chunk[] = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, source: `s${i}`, title: `Title ${i}`, text: `Body text ${i}`, embedding: fakeEmbed(`chunk-${i}`) }));

  for (const tc of cases) {
    const route = await runRoute(tc.history, chunks, fixture.patient, fixture.medications, fixture.quizSessions, fixture.journalEntries, fixture.appointments, async (t: string) => fakeEmbed(t), cosineSimilarity);

    const retrievalQuery = replica.buildRetrievalQuery(tc.history);
    const top = replica.topK(replica.rankChunks(fakeEmbed(retrievalQuery), chunks, cosineSimilarity)).map((r) => r.chunk);
    const knowledgeContext = replica.buildKnowledgeContext(top);
    const patientContext = replica.buildPatientContext(fixture);
    const systemInstruction = replica.buildSystemInstruction(knowledgeContext, patientContext);

    const mismatches = [
      route.retrievalQuery !== retrievalQuery && "retrieval query",
      JSON.stringify(route.topChunks.map((c: replica.Chunk) => c.id)) !== JSON.stringify(top.map((c) => c.id)) && "top-K selection",
      route.knowledgeContext !== knowledgeContext && "knowledge context",
      route.patientContext !== patientContext && "patient context",
      route.systemInstruction !== systemInstruction && "system prompt",
    ].filter(Boolean);
    if (mismatches.length) return { ok: false, detail: `replica.ts behaves differently from route.ts on case ${tc.id}: ${mismatches.join(", ")}.` };
  }
  return { ok: true, detail: `replica.ts produced identical query, top-K, contexts and system prompt to the live route code for all ${cases.length} cases (fake embeddings, no API calls).` };
}
