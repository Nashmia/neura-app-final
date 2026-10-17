/**
 * Care Assistant RAG baseline evaluation.   npm run eval:rag -- [flags]
 *
 *   (no flags)        Retrieval evaluation for all cases (embedding calls only) + patient-context checks.
 *   --answers         Also generate answers (Gemini path only) for the answer subset — max 5 by default.
 *   --limit=N         Number of answers to generate with --answers (default 5).
 *   --ids=a,b         Restrict the run (retrieval and answers) to these case ids.
 *   --delay=S         Seconds to wait between generation calls (default 20).
 *   --embed-delay=MS  Milliseconds between embedding calls (default 700).
 *   --judge           Also score answers with the ADVISORY LLM judge (one extra generation per answer).
 *   --kb=mongo|local  Where to read knowledge chunks: MongoDB knowledgeChunks, read-only (default), or data/db.json.
 *
 * Writes evaluation/reports/<timestamp>/{report.json, report.md, scoring-sheet.csv}.
 * Never reads or writes patient data in any database: patient data comes from fixtures/synthetic-patient.json.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { apiCalls, installFetchCounter, redact, setPhase, summariseCalls } from "./call-counter";
import { checkRouteDrift, readModelSettings } from "./drift-check";
import { checkReplicaEquivalence } from "./equivalence-check";
import { loadKnowledgeChunks } from "./kb-source";
import * as replica from "./replica";
import { testCases, type TestCase } from "./test-cases";
import { writeReports, type CaseResult, type RunReport } from "./report";

config({ path: join(__dirname, "..", ".env.local"), quiet: true });
installFetchCounter(); // before anything imports @google/genai

const arg = (name: string) => process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const argValue = (name: string, fallback: string) => arg(name)?.split("=")[1] ?? fallback;
const flags = {
  answers: Boolean(arg("answers")),
  judge: Boolean(arg("judge")),
  limit: Number(argValue("limit", "5")),
  ids: arg("ids") ? argValue("ids", "").split(",").map((s) => s.trim()).filter(Boolean) : null,
  delaySeconds: Number(argValue("delay", "20")),
  embedDelayMs: Number(argValue("embed-delay", "700")),
  kb: (argValue("kb", "mongo") === "local" ? "local" : "mongo") as "mongo" | "local",
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ms = (start: number) => Math.round((performance.now() - start) * 10) / 10;
const log = (...parts: unknown[]) => console.log(redact(parts.map(String).join(" ")));

async function main() {
  const startedAt = new Date();
  if (flags.judge && !flags.answers) throw new Error("--judge needs --answers.");
  if (flags.answers && flags.limit > 5) log(`! --limit=${flags.limit} is above the recommended maximum of 5 generation calls; this uses more of the shared free-tier quota.`);

  const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "synthetic-patient.json"), "utf8"));
  const cases: TestCase[] = flags.ids ? testCases.filter((c) => flags.ids!.includes(c.id)) : testCases;
  if (!cases.length) throw new Error("No test cases selected.");

  // Production helpers, imported unchanged (after the fetch counter is installed).
  const { embedText, cosineSimilarity } = await import("../lib/embeddings");

  // 1. Drift checks (no API calls).
  const drift = checkRouteDrift();
  const equivalence = await checkReplicaEquivalence(fixture, testCases, cosineSimilarity);
  const settings = readModelSettings();
  log(`Drift: ${drift.ok ? "OK" : "DRIFT"} — ${drift.detail}`);
  log(`Equivalence: ${equivalence.ok ? "OK" : "MISMATCH"} — ${equivalence.detail}`);

  // 2. Knowledge base (read-only).
  setPhase("kb-load");
  const kbStart = performance.now();
  const { chunks, source: kbSource } = await loadKnowledgeChunks(flags.kb);
  const kbLoadMs = ms(kbStart);
  const titleOf = new Map(chunks.map((c) => [c.source, c.title]));
  log(`Knowledge base: ${chunks.length} chunks from ${kbSource} in ${kbLoadMs} ms`);

  const patientContext = replica.buildPatientContext(fixture);
  const results: CaseResult[] = [];
  const queryEmbeddings = new Map<string, number[]>();

  // 3. Patient-context checks + retrieval for every case.
  setPhase("retrieval");
  for (const [i, tc] of cases.entries()) {
    const r: CaseResult = {
      id: tc.id, category: tc.category, question: tc.history[tc.history.length - 1].text, turns: tc.history.length,
      expectedSources: tc.expectedSources ?? [], expectedFacts: tc.expectedFacts ?? [], forbiddenFacts: tc.forbiddenFacts ?? [],
      knownLimitation: tc.knownLimitation, expectedBehaviour: tc.expectedBehaviour, answerSubset: Boolean(tc.answerSubset),
      difficulty: tc.difficulty ?? "easy", requireAllSources: Boolean(tc.requireAllSources),
      context: { status: "n/a", missingFacts: [], presentForbidden: [] },
      retrieval: { status: "not run" },
      answer: { status: "not run" },
    };

    // Patient-context coverage (deterministic, no API call).
    if (r.expectedFacts.length || r.forbiddenFacts.length) {
      const missingFacts = r.expectedFacts.filter((f) => !patientContext.includes(f));
      const presentForbidden = r.forbiddenFacts.filter((f) => patientContext.includes(f));
      const passed = !missingFacts.length && !presentForbidden.length;
      r.context = { status: passed ? "pass" : tc.knownLimitation ? "fail (known limitation)" : "fail", missingFacts, presentForbidden };
    }

    // Retrieval (one embedding call), exactly as route.ts:65-74.
    const query = replica.buildRetrievalQuery(tc.history);
    try {
      const t0 = performance.now();
      const embedding = await embedText(query);
      const embedMs = ms(t0);
      const t1 = performance.now();
      const ranking = replica.rankChunks(embedding, chunks, cosineSimilarity);
      const rankMs = ms(t1);
      queryEmbeddings.set(tc.id, embedding);
      const top = replica.topK(ranking);
      const expectedRank = r.expectedSources.length
        ? Math.min(...r.expectedSources.map((s) => ranking.findIndex((x) => x.chunk.source === s) + 1).filter((n) => n > 0))
        : null;
      const inTopK = r.expectedSources.filter((s) => top.some((x) => x.chunk.source === s));
      const hit = r.requireAllSources
        ? inTopK.length === r.expectedSources.length
        : expectedRank !== null && Number.isFinite(expectedRank) && expectedRank <= replica.TOP_K;
      r.retrieval = {
        status: r.expectedSources.length ? (hit ? "pass" : "fail") : "n/a (no expected article)",
        rank: expectedRank !== null && Number.isFinite(expectedRank) ? expectedRank : null,
        expectedScores: Object.fromEntries(r.expectedSources.map((s) => [s, round(ranking.find((x) => x.chunk.source === s)?.score)])),
        top: top.map((x, k) => ({ rank: k + 1, source: x.chunk.source, title: x.chunk.title, score: round(x.score) })),
        expectedInTopK: inTopK,
        top1Score: round(ranking[0]?.score), top4Score: round(top[top.length - 1]?.score),
        embedMs, rankMs, retrievalMs: Math.round((embedMs + rankMs) * 10) / 10,
      };
      for (const s of r.expectedSources) if (!titleOf.has(s)) r.retrieval.warning = `Expected source "${s}" is not in the knowledge base.`;
    } catch (error) {
      r.retrieval = { status: "error", error: redact(String(error instanceof Error ? error.message : error)).slice(0, 300) };
    }
    results.push(r);
    log(`[${i + 1}/${cases.length}] ${tc.id.padEnd(4)} ${r.difficulty.padEnd(4)} retrieval=${r.retrieval.status}${r.retrieval.rank ? ` (rank ${r.retrieval.rank})` : ""} context=${r.context.status}`);
    if (i < cases.length - 1) await sleep(flags.embedDelayMs);
  }

  // 4. Optional answer generation (Gemini path only; ASSISTANT_MODEL_PROVIDER is ignored on purpose).
  let generationSkippedReason: string | undefined = flags.answers ? undefined : "Answer generation not requested (run with --answers).";
  if (flags.answers) {
    const { runAssistantTurn } = await import("../lib/gemini");
    const { judgeAnswer } = await import("./judge");
    const subset = results.filter((r) => (flags.ids ? true : r.answerSubset) && queryEmbeddings.has(r.id)).slice(0, flags.limit);
    let quotaHit = false;
    for (const [i, r] of subset.entries()) {
      if (quotaHit) { r.answer = { status: "not run (quota exhausted earlier in this run)" }; continue; }
      const tc = cases.find((c) => c.id === r.id)!;
      setPhase(`answer:${r.id}`);
      const t0 = performance.now();
      const top = replica.topK(replica.rankChunks(queryEmbeddings.get(r.id)!, chunks, cosineSimilarity)).map((x) => x.chunk);
      const systemInstruction = replica.buildSystemInstruction(replica.buildKnowledgeContext(top), patientContext);
      const contextMs = ms(t0);
      try {
        const g0 = performance.now();
        const answer = await runAssistantTurn(systemInstruction, tc.history);
        const generationMs = ms(g0);
        r.answer = {
          status: "generated — awaiting human score", text: answer, sourcesShown: top.map((c) => c.title),
          contextMs, generationMs, endToEndMs: Math.round(((r.retrieval.retrievalMs ?? 0) + contextMs + generationMs) * 10) / 10,
          systemInstruction,
        };
        if (flags.judge) {
          setPhase(`judge:${r.id}`);
          await sleep(flags.delaySeconds * 1000);
          r.answer.judge = await judgeAnswer(runAssistantTurn, tc, systemInstruction, answer).catch((e) => ({ error: redact(String(e?.message ?? e)).slice(0, 200) }));
        }
        log(`answer ${r.id}: generated in ${generationMs} ms`);
      } catch (error) {
        const message = redact(String(error instanceof Error ? error.message : error));
        quotaHit = /RESOURCE_EXHAUSTED|"code":429/.test(message);
        r.answer = { status: quotaHit ? "error (quota exhausted)" : "error", error: message.slice(0, 300) };
        log(`answer ${r.id}: ${r.answer.status}`);
      }
      if (i < subset.length - 1) await sleep(flags.delaySeconds * 1000);
    }
  }

  // 5. Report.
  const git = (cmd: string) => { try { return execSync(cmd, { cwd: join(__dirname, ".."), encoding: "utf8" }).trim(); } catch { return "unknown"; } };
  const report: RunReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    git: {
      commit: git("git rev-parse HEAD"),
      productionCodeModified: git("git status --porcelain -- app lib scripts") !== "",
      workingTreeDirty: git("git status --porcelain") !== "",
    },
    environment: { node: process.version, locale: Intl.DateTimeFormat().resolvedOptions().locale, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    flags,
    settings: { ...settings, topK: replica.TOP_K, retrievalQuery: "last 4 turns joined with newlines (route.ts:65-68)", knowledgeBase: { chunks: chunks.length, source: kbSource, loadMs: kbLoadMs } },
    driftCheck: drift,
    equivalenceCheck: equivalence,
    generationSkippedReason,
    apiCalls: { summary: summariseCalls(), log: apiCalls },
    results,
  };
  const dir = writeReports(report, join(__dirname, "reports"));
  const calls = report.apiCalls.summary;
  log(`\nAPI requests this run: ${calls.total} (embedding ${calls.embedding}, generation ${calls.generation}, non-200 ${calls.failedHttp})`);
  log(`Reports written to ${dir}`);
}

function round(n: number | undefined) {
  return n === undefined ? null : Math.round(n * 10000) / 10000;
}

main().catch((error) => {
  console.error(redact(String(error instanceof Error ? error.stack ?? error.message : error)));
  process.exit(1);
});
