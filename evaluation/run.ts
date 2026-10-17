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
 *   --baseline=DIR    Report folder to compare against (default: the Phase 1 baseline run). --baseline=none to skip.
 *   --label=TEXT      Description shown at the top of the report.
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
import { loadKnowledgeChunks } from "./kb-source";
import { testCases, type TestCase } from "./test-cases";
import { writeReports, type CaseResult, type RunReport } from "./report";
import { compareWithBaseline, NUMERIC_DATE } from "./compare";

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
  baseline: argValue("baseline", "reports/2026-10-17T10-48-38"),
  label: argValue("label", "Evaluation of the current Care Assistant pipeline"),
  // Retrieval stages; default to what production uses (lib/retrieval.ts RETRIEVAL_DEFAULTS).
  rerank: arg("rerank") ? argValue("rerank", "on") !== "off" : undefined,
  rewrite: arg("rewrite") ? argValue("rewrite", "on") !== "off" : undefined,
  taskDelayMs: Number(argValue("task-delay", "4000")),
};

/**
 * The fixture's dates are fixed (Oct-Nov 2026), so "today" is pinned too: the appointment filter and the
 * "Today is ..." line then give the same prompt on every run, whatever the real date.
 */
const EVAL_NOW = new Date("2026-10-17T09:00:00Z");
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

  // Production code, imported unchanged (after the fetch counter is installed).
  const { embedText } = await import("../lib/embeddings");
  const ctx = await import("../lib/assistant-context");
  const { retrieve, RETRIEVAL_DEFAULTS, CANDIDATE_K, MAX_SELECTED, MIN_RELEVANCE } = await import("../lib/retrieval");
  const { runJsonTask } = await import("../lib/gemini");
  flags.rerank ??= RETRIEVAL_DEFAULTS.rerank;
  flags.rewrite ??= RETRIEVAL_DEFAULTS.rewrite;

  // 1. Check the route still uses the shared module the evaluation imports (no API calls).
  const drift = checkRouteDrift();
  const settings = readModelSettings();
  log(`Production-code check: ${drift.ok ? "OK" : "DRIFT"} — ${drift.detail}`);

  // 2. Knowledge base (read-only).
  setPhase("kb-load");
  const kbStart = performance.now();
  const { chunks, source: kbSource } = await loadKnowledgeChunks(flags.kb);
  const kbLoadMs = ms(kbStart);
  const titleOf = new Map(chunks.map((c) => [c.source, c.title]));
  log(`Knowledge base: ${chunks.length} chunks from ${kbSource} in ${kbLoadMs} ms`);

  const patientData = { patient: fixture.patient, medications: fixture.medications, sessions: fixture.quizSessions, journalEntries: fixture.journalEntries, appointments: fixture.appointments };
  // Built per case: like the route, the record selection depends on the caregiver's latest message.
  const patientContextFor = (tc: TestCase) => ctx.buildPatientContext(patientData, EVAL_NOW, tc.history[tc.history.length - 1].text);
  const results: CaseResult[] = [];
  const retrievals = new Map<string, Awaited<ReturnType<typeof retrieve>>>();

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
      const patientContext = patientContextFor(tc);
      const missingFacts = r.expectedFacts.filter((f) => !patientContext.includes(f));
      const presentForbidden = r.forbiddenFacts.filter((f) => patientContext.includes(f));
      const passed = !missingFacts.length && !presentForbidden.length;
      r.context = { status: passed ? "pass" : tc.knownLimitation ? "fail (known limitation)" : "fail", missingFacts, presentForbidden };
    }

    // Retrieval with the route's own pipeline (lib/retrieval.ts): 1 embedding, + 1 rerank call, + 1 rewrite call for follow-ups.
    try {
      const res = await retrieve(tc.history, chunks, { embed: embedText, task: runJsonTask }, { rerank: flags.rerank, rewrite: flags.rewrite });
      retrievals.set(tc.id, res);
      const { ranking } = res;
      const top = ranking.slice(0, ctx.TOP_K);
      const expectedRank = r.expectedSources.length
        ? Math.min(...r.expectedSources.map((s) => ranking.findIndex((x) => x.chunk.source === s) + 1).filter((n) => n > 0))
        : null;
      const inTopK = r.expectedSources.filter((s) => top.some((x) => x.chunk.source === s));
      const hit = r.requireAllSources
        ? inTopK.length === r.expectedSources.length
        : expectedRank !== null && Number.isFinite(expectedRank) && expectedRank <= ctx.TOP_K;
      const selected = res.selected.map((c) => c.source);
      const selectedExpected = r.expectedSources.filter((s) => selected.includes(s));
      r.retrieval = {
        // Dense top-4 (the Phase 1/2 behaviour), kept for comparability.
        status: r.expectedSources.length ? (hit ? "pass" : "fail") : "n/a (no expected article)",
        rank: expectedRank !== null && Number.isFinite(expectedRank) ? expectedRank : null,
        expectedScores: Object.fromEntries(r.expectedSources.map((s) => [s, round(ranking.find((x) => x.chunk.source === s)?.score)])),
        top: top.map((x, k) => ({ rank: k + 1, source: x.chunk.source, title: x.chunk.title, score: round(x.score) })),
        expectedInTopK: inTopK,
        top1Score: round(ranking[0]?.score), top4Score: round(top[top.length - 1]?.score),
        embedMs: res.timings.embedMs, rankMs: res.timings.rankMs,
        retrievalMs: Math.round(((res.timings.rewriteMs ?? 0) + res.timings.embedMs + res.timings.rankMs + (res.timings.rerankMs ?? 0)) * 10) / 10,
        // What production now sends to the model.
        pipeline: {
          mode: res.mode,
          selected,
          relevance: res.relevance,
          rewrittenQuery: res.rewrittenQuery,
          status: r.expectedSources.length
            ? (r.requireAllSources ? selectedExpected.length === r.expectedSources.length : selectedExpected.length > 0) ? "pass" : "fail"
            : selected.length ? `n/a (${selected.length} article${selected.length === 1 ? "" : "s"} sent)` : "n/a (no articles sent)",
          precision: selected.length && r.expectedSources.length ? round(selectedExpected.length / selected.length) : null,
          candidateRecall: r.expectedSources.length ? res.candidates.some((c) => r.expectedSources.includes(c.chunk.source)) : null,
          rewriteMs: res.timings.rewriteMs, rerankMs: res.timings.rerankMs,
          errors: res.errors.map((e) => redact(e)),
        },
      };
      for (const s of r.expectedSources) if (!titleOf.has(s)) r.retrieval.warning = `Expected source "${s}" is not in the knowledge base.`;
    } catch (error) {
      r.retrieval = { status: "error", error: redact(String(error instanceof Error ? error.message : error)).slice(0, 300) };
    }
    results.push(r);
    const p = r.retrieval.pipeline;
    log(`[${i + 1}/${cases.length}] ${tc.id.padEnd(4)} ${r.difficulty.padEnd(4)} dense@4=${r.retrieval.status}${r.retrieval.rank ? ` (rank ${r.retrieval.rank})` : ""} pipeline=${p ? `${p.status} [${p.selected.join(", ") || "none"}]${p.mode === "dense-fallback" ? " FALLBACK" : ""}` : "–"} context=${r.context.status}`);
    if (i < cases.length - 1) await sleep(flags.rerank ? flags.taskDelayMs : flags.embedDelayMs);
  }

  // 4. Optional answer generation (Gemini path only; ASSISTANT_MODEL_PROVIDER is ignored on purpose).
  let generationSkippedReason: string | undefined = flags.answers ? undefined : "Answer generation not requested (run with --answers).";
  if (flags.answers) {
    const { runAssistantTurn } = await import("../lib/gemini");
    const { judgeAnswer } = await import("./judge");
    const subset = results.filter((r) => (flags.ids ? true : r.answerSubset) && retrievals.has(r.id)).slice(0, flags.limit);
    let quotaHit = false;
    for (const [i, r] of subset.entries()) {
      if (quotaHit) { r.answer = { status: "not run (quota exhausted earlier in this run)" }; continue; }
      const tc = cases.find((c) => c.id === r.id)!;
      setPhase(`answer:${r.id}`);
      const t0 = performance.now();
      const top = retrievals.get(r.id)!.selected; // exactly what the route sends
      const systemInstruction = ctx.buildSystemInstruction(ctx.buildKnowledgeContext(top), patientContextFor(tc));
      const contextMs = ms(t0);
      try {
        const g0 = performance.now();
        const answer = await runAssistantTurn(systemInstruction, tc.history);
        const generationMs = ms(g0);
        const cited = ctx.citedSources(answer, top); // what the route returns and the user sees
        r.answer = {
          status: "generated — awaiting human score", text: answer, sourcesShown: cited.map((c) => c.title),
          retrievedTitles: top.map((c) => c.title), citedNumbers: cited.map((c) => c.n),
          citationPrecision: r.expectedSources.length && cited.length ? Math.round((cited.filter((c) => r.expectedSources.includes(c.source)).length / cited.length) * 1000) / 1000 : null,
          numericDates: answer.match(NUMERIC_DATE) ?? [],
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
    label: flags.label,
    settings: { ...settings, topK: ctx.TOP_K, evalNow: EVAL_NOW.toISOString(), appTimeZone: ctx.APP_TIME_ZONE, retrievalQuery: `last 4 turns joined with newlines${flags.rewrite ? "; follow-ups rewritten into a standalone query" : ""}`, pipeline: flags.rerank ? `dense top ${CANDIDATE_K} -> LLM rerank (lite model), keep score >= ${MIN_RELEVANCE}, max ${MAX_SELECTED}` : `dense top ${ctx.TOP_K}`, knowledgeBase: { chunks: chunks.length, source: kbSource, loadMs: kbLoadMs } },
    driftCheck: drift,
    generationSkippedReason,
    apiCalls: { summary: summariseCalls(), log: apiCalls },
    results,
  };
  if (flags.baseline !== "none") report.comparison = compareWithBaseline(report, join(__dirname, flags.baseline));
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
