/**
 * Writes one run's results as report.json (complete, machine-readable), report.md (readable summary +
 * every case) and scoring-sheet.csv (manual 0/1/2 scoring of generated answers, see RUBRIC.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redact, type ApiCall } from "./call-counter";
import type { JudgeScores } from "./judge";

export type CaseResult = {
  id: string;
  category: string;
  question: string;
  turns: number;
  expectedSources: string[];
  expectedFacts: string[];
  forbiddenFacts: string[];
  knownLimitation?: string;
  expectedBehaviour: string;
  answerSubset: boolean;
  difficulty: "easy" | "hard";
  requireAllSources: boolean;
  context: { status: string; missingFacts: string[]; presentForbidden: string[] };
  retrieval: {
    status: string;
    rank?: number | null;
    expectedScores?: Record<string, number | null>;
    expectedInTopK?: string[];
    top?: { rank: number; source: string; title: string; score: number | null }[];
    top1Score?: number | null;
    top4Score?: number | null;
    embedMs?: number;
    rankMs?: number;
    retrievalMs?: number;
    warning?: string;
    error?: string;
    /** Phase 3: what the production retrieval pipeline actually sends to the model. */
    pipeline?: {
      mode: string;
      selected: string[];
      relevance?: Record<string, number>;
      rewrittenQuery?: string;
      status: string;
      precision: number | null;
      candidateRecall: boolean | null;
      rewriteMs?: number;
      rerankMs?: number;
      errors: string[];
    };
  };
  answer: {
    status: string;
    text?: string;
    sourcesShown?: string[]; // what the user sees: only the cited articles (Phase 2+)
    retrievedTitles?: string[];
    citedNumbers?: number[];
    citationPrecision?: number | null; // cited and expected / cited, for cases with an expected article
    numericDates?: string[]; // ambiguous numeric dates found in the answer, e.g. 11/10

    contextMs?: number;
    generationMs?: number;
    endToEndMs?: number;
    systemInstruction?: string;
    judge?: JudgeScores | { error: string };
    error?: string;
  };
};

export type RunReport = {
  startedAt: string;
  finishedAt: string;
  git: { commit: string; productionCodeModified: boolean; workingTreeDirty: boolean };
  environment: { node: string; locale: string; timeZone: string };
  flags: Record<string, unknown>;
  settings: Record<string, unknown>;
  label: string;
  driftCheck: { ok: boolean; detail: string };
  comparison?: string; // Markdown before/after comparison with a baseline run
  generationSkippedReason?: string;
  apiCalls: { summary: ReturnType<typeof import("./call-counter").summariseCalls>; log: ApiCall[] };
  results: CaseResult[];
  aggregates?: ReturnType<typeof aggregate>;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 10) / 10;
};
const max = (xs: number[]) => (xs.length ? Math.max(...xs) : null);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

const isScored = (r: CaseResult) => r.expectedSources.length > 0 && (r.retrieval.status === "pass" || r.retrieval.status === "fail");

/** Hit rate @4 / @1 and MRR for one group of cases (all, easy, or hard). */
function retrievalStats(scored: CaseResult[]) {
  const ranks = scored.map((r) => r.retrieval.rank ?? null);
  const hits4 = scored.filter((r) => r.retrieval.status === "pass").length;
  const hits1 = ranks.filter((k) => k === 1).length;
  return {
    cases: scored.length,
    hitsAt4: hits4,
    hitRateAt4: scored.length ? r3(hits4 / scored.length) : null,
    hitsAt1: hits1,
    hitRateAt1: scored.length ? r3(hits1 / scored.length) : null,
    meanReciprocalRank: scored.length ? r3(ranks.reduce((s: number, k) => s + (k ? 1 / k : 0), 0) / scored.length) : null,
    meanReciprocalRankAt4: scored.length ? r3(ranks.reduce((s: number, k) => s + (k && k <= 4 ? 1 / k : 0), 0) / scored.length) : null,
    failures: scored.filter((r) => r.retrieval.status === "fail").map((r) => r.id),
  };
}

/** Phase 3 pipeline metrics: hit rate of the articles actually sent, how many are sent, and how many are right. */
export function pipelineStats(results: CaseResult[]) {
  const ran = results.filter((r) => r.retrieval.pipeline);
  if (!ran.length) return null;
  const scoredIn = (rs: CaseResult[]) => rs.filter((r) => r.retrieval.pipeline!.status === "pass" || r.retrieval.pipeline!.status === "fail");
  const group = (rs: CaseResult[]) => {
    const s = scoredIn(rs);
    const hits = s.filter((r) => r.retrieval.pipeline!.status === "pass").length;
    const precisions = s.map((r) => r.retrieval.pipeline!.precision).filter((n): n is number => typeof n === "number");
    return {
      cases: s.length,
      hits,
      hitRate: s.length ? r3(hits / s.length) : null,
      candidateRecall: s.length ? r3(s.filter((r) => r.retrieval.pipeline!.candidateRecall).length / s.length) : null,
      meanPrecision: precisions.length ? r3(precisions.reduce((a, b) => a + b, 0) / precisions.length) : null,
      failures: s.filter((r) => r.retrieval.pipeline!.status === "fail").map((r) => r.id),
    };
  };
  const sent = (rs: CaseResult[]) => (rs.length ? r3(rs.reduce((n, r) => n + r.retrieval.pipeline!.selected.length, 0) / rs.length) : null);
  const noArticleExpected = ran.filter((r) => !r.expectedSources.length);
  return {
    mode: [...new Set(ran.map((r) => r.retrieval.pipeline!.mode))].join(", "),
    fallbacks: ran.filter((r) => r.retrieval.pipeline!.mode === "dense-fallback").map((r) => r.id),
    all: group(ran),
    easy: group(ran.filter((r) => r.difficulty !== "hard")),
    hard: group(ran.filter((r) => r.difficulty === "hard")),
    meanArticlesSent: sent(ran),
    meanArticlesSentWhenNoneExpected: sent(noArticleExpected),
    noArticleCasesWithZeroSent: `${noArticleExpected.filter((r) => !r.retrieval.pipeline!.selected.length).length}/${noArticleExpected.length}`,
    rerankMs: { median: median(ran.map((r) => r.retrieval.pipeline!.rerankMs).filter((n): n is number => typeof n === "number")), max: max(ran.map((r) => r.retrieval.pipeline!.rerankMs).filter((n): n is number => typeof n === "number")) },
  };
}

export function aggregate(results: CaseResult[]) {
  const scored = results.filter(isScored);
  const all = retrievalStats(scored);
  const byDifficulty = {
    easy: retrievalStats(scored.filter((r) => r.difficulty !== "hard")),
    hard: retrievalStats(scored.filter((r) => r.difficulty === "hard")),
  };

  const byCategory = Object.fromEntries(
    [...new Set(scored.map((r) => r.category))].map((cat) => {
      const rs = scored.filter((r) => r.category === cat);
      return [cat, { cases: rs.length, hitAt4: rs.filter((r) => r.retrieval.status === "pass").length }];
    })
  );

  const ctx = results.filter((r) => r.context.status !== "n/a");
  const retrievalMs = results.map((r) => r.retrieval.retrievalMs).filter((n): n is number => typeof n === "number");
  const embedMs = results.map((r) => r.retrieval.embedMs).filter((n): n is number => typeof n === "number");
  const rankMs = results.map((r) => r.retrieval.rankMs).filter((n): n is number => typeof n === "number");
  const genMs = results.map((r) => r.answer.generationMs).filter((n): n is number => typeof n === "number");
  const e2eMs = results.map((r) => r.answer.endToEndMs).filter((n): n is number => typeof n === "number");

  const insufficientTop1 = results.filter((r) => r.category === "insufficient-info" && r.retrieval.top1Score != null).map((r) => r.retrieval.top1Score as number);
  const hitTop1 = scored.filter((r) => r.retrieval.status === "pass" && r.retrieval.top1Score != null).map((r) => r.retrieval.top1Score as number);

  return {
    retrieval: {
      casesWithExpectedArticle: scored.length,
      hitRateAt4: all.hitRateAt4,
      hitsAt4: all.hitsAt4,
      hitRateAt1: all.hitRateAt1,
      meanReciprocalRank: all.meanReciprocalRank,
      meanReciprocalRankAt4: all.meanReciprocalRankAt4,
      byDifficulty,
      byCategory,
      errors: results.filter((r) => r.retrieval.status === "error").length,
      top1ScoreOnHardFailures: scored.filter((r) => r.difficulty === "hard" && r.retrieval.status === "fail").map((r) => ({ id: r.id, top1: r.retrieval.top1Score, expected: r.retrieval.expectedScores })),
      top1ScoreOnHits: { min: hitTop1.length ? r3(Math.min(...hitTop1)) : null, median: hitTop1.length ? r3(median(hitTop1.map((x) => x * 1000))! / 1000) : null },
      top1ScoreOnInsufficientInfo: { max: insufficientTop1.length ? r3(Math.max(...insufficientTop1)) : null, values: insufficientTop1.map(r3) },
    },
    pipeline: pipelineStats(results),
    patientContext: {
      checked: ctx.length,
      pass: ctx.filter((r) => r.context.status === "pass").length,
      failKnownLimitation: ctx.filter((r) => r.context.status === "fail (known limitation)").length,
      failUnexpected: ctx.filter((r) => r.context.status === "fail").length,
    },
    latencyMs: {
      embedding: { median: median(embedMs), max: max(embedMs) },
      similarityRanking: { median: median(rankMs), max: max(rankMs) },
      retrievalTotal: { median: median(retrievalMs), max: max(retrievalMs) },
      generation: { median: median(genMs), max: max(genMs), n: genMs.length },
      endToEnd: { median: median(e2eMs), max: max(e2eMs), n: e2eMs.length },
    },
    answers: {
      generated: results.filter((r) => r.answer.status.startsWith("generated")).length,
      errors: results.filter((r) => r.answer.status.startsWith("error")).length,
      ...answerChecks(results),
    },
  };
}

/** Automatic answer checks (no API calls). Human rubric scores remain the answer-quality result. */
export function answerChecks(results: CaseResult[]) {
  const answered = results.filter((r) => r.answer.text);
  const precisions = answered.map((r) => r.answer.citationPrecision).filter((n): n is number => typeof n === "number");
  return {
    meanSourcesShown: answered.length ? r3(answered.reduce((s, r) => s + (r.answer.sourcesShown?.length ?? 0), 0) / answered.length) : null,
    answersWithCitations: answered.filter((r) => (r.answer.citedNumbers?.length ?? 0) > 0).length,
    meanCitationPrecision: precisions.length ? r3(precisions.reduce((a, b) => a + b, 0) / precisions.length) : null,
    answersWithNumericDates: answered.filter((r) => (r.answer.numericDates?.length ?? 0) > 0).map((r) => r.id),
  };
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const mdCell = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function writeReports(report: RunReport, reportsRoot: string): string {
  report.aggregates = aggregate(report.results);
  const stamp = report.startedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
  const dir = join(reportsRoot, stamp);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "report.json"), redact(JSON.stringify(report, null, 2)));
  writeFileSync(join(dir, "report.md"), redact(renderMarkdown(report)));
  writeFileSync(join(dir, "scoring-sheet.csv"), redact(renderScoringSheet(report)));
  if (report.comparison) writeFileSync(join(dir, "comparison.md"), redact(report.comparison));
  return dir;
}

function renderScoringSheet(report: RunReport): string {
  const header = ["id", "category", "question", "expected_behaviour", "expected_sources", "expected_facts", "answer", "sources_shown", "groundedness_0_2", "correctness_0_2", "attribution_0_2", "safety_0_2", "notes", "llm_judge_advisory"];
  const rows = report.results
    .filter((r) => r.answerSubset || r.answer.status !== "not run")
    .map((r) => {
      const j = r.answer.judge;
      const judge = !j ? "" : "error" in j ? `judge error: ${j.error}` : `ADVISORY g${j.groundedness} c${j.correctness} a${j.attribution} s${j.safety} — ${j.rationale}`;
      return [r.id, r.category, r.question, r.expectedBehaviour, r.expectedSources.join("; "), r.expectedFacts.join("; "),
        r.answer.text ?? `(${r.answer.status})`, (r.answer.sourcesShown ?? []).join("; "), "", "", "", "", "", judge];
    });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function renderMarkdown(report: RunReport): string {
  const a = report.aggregates!;
  const s = report.settings as Record<string, any>;
  const c = report.apiCalls.summary;
  const L: string[] = [];
  const pct = (x: number | null) => (x === null ? "n/a" : `${Math.round(x * 1000) / 10}%`);

  L.push(`# Care Assistant RAG evaluation — ${report.startedAt.slice(0, 16).replace("T", " ")} UTC`, "");
  L.push(`> ${report.label}. Patient data is synthetic (evaluation/fixtures). Knowledge chunks: ${s.knowledgeBase.source}. Generated answers are **not deterministic** (temperature ${s.assistantTemperature}); re-runs can differ.`, "");
  if (!report.driftCheck.ok) L.push(`> ⚠️ **DRIFT:** ${report.driftCheck.detail}`, "");

  L.push("## Run details", "");
  L.push("| | |", "|---|---|");
  L.push(`| Started / finished | ${report.startedAt} / ${report.finishedAt} |`);
  L.push(`| Git commit | \`${report.git.commit}\`${report.git.productionCodeModified ? " ⚠️ app/lib/scripts have uncommitted changes" : ""} |`);
  L.push(`| Node / locale / time zone | ${report.environment.node} / ${report.environment.locale} / ${report.environment.timeZone} |`);
  L.push(`| Embedding model | ${s.embeddingModel} |`);
  L.push(`| Generation model (Gemini path forced) | ${s.generationModel} (quota fallback: ${s.quotaFallbackModel}), temperature ${s.assistantTemperature} |`);
  L.push(`| Retrieval | top-K = ${s.topK}; query = ${s.retrievalQuery}; ${s.knowledgeBase.chunks} chunks, loaded in ${s.knowledgeBase.loadMs} ms |`);
  L.push(`| Flags | \`${JSON.stringify(report.flags)}\` |`);
  L.push(`| Production-code check | ${report.driftCheck.ok ? "✅" : "❌"} ${report.driftCheck.detail} |`);
  L.push("");

  L.push("## Gemini API requests made by this run", "");
  L.push(`**${c.total} total** — ${c.embedding} embedding, ${c.generation} generation, ${c.failedHttp} non-200 responses. Counted at the HTTP level, so retries and quota-fallback calls are included.`, "");
  L.push("| Method · model | Requests |", "|---|---|");
  for (const [k, v] of Object.entries(c.byMethodAndModel)) L.push(`| ${k} | ${v} |`);
  if (report.generationSkippedReason) L.push("", `Answer generation: ${report.generationSkippedReason}`);
  L.push("");

  L.push("## Results", "");
  L.push("### Retrieval (knowledge-base articles)", "");
  L.push(`- **Hit rate @4:** ${pct(a.retrieval.hitRateAt4)} (${a.retrieval.hitsAt4}/${a.retrieval.casesWithExpectedArticle} cases with an expected article)`);
  L.push(`- **Hit rate @1:** ${pct(a.retrieval.hitRateAt1)}`);
  L.push(`- **Mean reciprocal rank:** ${a.retrieval.meanReciprocalRank ?? "n/a"} over the full ranking (MRR@4: ${a.retrieval.meanReciprocalRankAt4 ?? "n/a"})`);
  L.push("", "| Difficulty | Cases | Hit @4 | Hit @1 | MRR | MRR@4 | Failed |", "|---|---|---|---|---|---|---|");
  for (const [k, v] of Object.entries(a.retrieval.byDifficulty)) L.push(`| ${k} | ${v.cases} | ${pct(v.hitRateAt4)} (${v.hitsAt4}) | ${pct(v.hitRateAt1)} (${v.hitsAt1}) | ${v.meanReciprocalRank ?? "n/a"} | ${v.meanReciprocalRankAt4 ?? "n/a"} | ${v.failures.join(", ") || "–"} |`);
  L.push("", "*Easy* cases were written knowing the article titles. *Hard* cases (h01–h15) were written the way a stressed caregiver types — vague, misspelt, emotional, sometimes two topics — before looking at the titles, then labelled. h10 requires **both** of its articles in the top 4.", "");
  L.push(`- **By category:** ${Object.entries(a.retrieval.byCategory).map(([k, v]: [string, any]) => `${k} ${v.hitAt4}/${v.cases}`).join(" · ")}`);
  L.push(`- **Similarity scores:** top-1 score on hits — min ${a.retrieval.top1ScoreOnHits.min ?? "n/a"}, median ${a.retrieval.top1ScoreOnHits.median ?? "n/a"}; top-1 score on insufficient-information questions — max ${a.retrieval.top1ScoreOnInsufficientInfo.max ?? "n/a"} (${a.retrieval.top1ScoreOnInsufficientInfo.values.join(", ")}). There is no score threshold today, so 4 articles are always sent.`);
  if (a.retrieval.errors) L.push(`- **Errors:** ${a.retrieval.errors} retrieval calls failed (see cases below).`);
  L.push("");
  if (a.pipeline) {
    const p = a.pipeline;
    L.push("### Retrieval pipeline (articles actually sent to the model)", "");
    L.push(`Mode: ${p.mode}${p.fallbacks.length ? ` · ⚠️ fell back to dense top-4 on: ${p.fallbacks.join(", ")}` : ""}. The dense @4 numbers above are the Phase 1/2 behaviour, computed from the same embeddings.`, "");
    L.push("| Set | Cases | Hit (expected article sent) | Expected article in the 8 candidates | Precision of sent articles | Failed |", "|---|---|---|---|---|---|");
    for (const [k, v] of [["all", p.all], ["easy", p.easy], ["hard", p.hard]] as const) {
      L.push(`| ${k} | ${v.cases} | ${pct(v.hitRate)} (${v.hits}) | ${pct(v.candidateRecall)} | ${v.meanPrecision ?? "n/a"} | ${v.failures.join(", ") || "–"} |`);
    }
    L.push("", `Articles sent per question: ${p.meanArticlesSent} on average (dense top-4 always sent 4); ${p.meanArticlesSentWhenNoneExpected} for questions that need no article, ${p.noArticleCasesWithZeroSent} of which got none. Rerank latency: median ${p.rerankMs.median ?? "–"} ms, max ${p.rerankMs.max ?? "–"} ms.`, "");
  }
  L.push("### Patient-context coverage (does the prompt contain the facts needed?)", "");
  L.push(`${a.patientContext.pass}/${a.patientContext.checked} pass · ${a.patientContext.failKnownLimitation} fail because of a known limitation · ${a.patientContext.failUnexpected} unexpected failures.`, "");
  if (a.answers.generated) {
    L.push("### Automatic answer checks", "");
    L.push(`${a.answers.generated} answers generated · sources shown per answer: ${a.answers.meanSourcesShown} · answers with at least one citation: ${a.answers.answersWithCitations}/${a.answers.generated} · mean citation precision (cases with an expected article): ${a.answers.meanCitationPrecision ?? "n/a"} · answers with numeric dates: ${a.answers.answersWithNumericDates.join(", ") || "none"}. Human rubric scores (scoring-sheet.csv) are the answer-quality result.`, "");
  }
  L.push("### Latency (ms)", "");
  L.push("| Stage | Median | Max | n |", "|---|---|---|---|");
  L.push(`| Embedding call | ${a.latencyMs.embedding.median ?? "–"} | ${a.latencyMs.embedding.max ?? "–"} | ${report.results.filter((r) => r.retrieval.embedMs != null).length} |`);
  L.push(`| Similarity ranking (in-process) | ${a.latencyMs.similarityRanking.median ?? "–"} | ${a.latencyMs.similarityRanking.max ?? "–"} | ${report.results.filter((r) => r.retrieval.rankMs != null).length} |`);
  L.push(`| Retrieval total | ${a.latencyMs.retrievalTotal.median ?? "–"} | ${a.latencyMs.retrievalTotal.max ?? "–"} | ${report.results.filter((r) => r.retrieval.retrievalMs != null).length} |`);
  L.push(`| Answer generation | ${a.latencyMs.generation.median ?? "–"} | ${a.latencyMs.generation.max ?? "–"} | ${a.latencyMs.generation.n} |`);
  L.push(`| End to end (retrieval + context + generation) | ${a.latencyMs.endToEnd.median ?? "–"} | ${a.latencyMs.endToEnd.max ?? "–"} | ${a.latencyMs.endToEnd.n} |`);
  L.push("", `Knowledge-base load (once per run here; production does it on every request): ${s.knowledgeBase.loadMs} ms. End-to-end reuses the retrieval embedding to save quota, so it is retrieval time + context build + generation time.`, "");

  L.push("## Every test case", "");
  L.push("| ID | Difficulty | Category | Retrieval | Rank | Top-1 (score) | Patient context | Answer |", "|---|---|---|---|---|---|---|---|");
  for (const r of report.results) {
    const top1 = r.retrieval.top?.[0];
    L.push(`| ${r.id} | ${r.difficulty} | ${r.category} | ${mdCell(r.retrieval.status)} | ${r.retrieval.rank ?? "–"} | ${top1 ? `${mdCell(top1.source)} (${top1.score})` : "–"} | ${mdCell(r.context.status)} | ${mdCell(r.answer.status)} |`);
  }
  L.push("");

  for (const r of report.results) {
    L.push(`### ${r.id} — ${r.category}${r.difficulty === "hard" ? " (hard)" : ""}${r.turns > 1 ? ` (${r.turns}-turn conversation)` : ""}`, "");
    L.push(`**Question:** ${r.question}`, "");
    if (r.expectedSources.length) L.push(`**Expected article(s):** ${r.expectedSources.join(", ")} → **${r.retrieval.status}**${r.retrieval.rank ? ` (best rank ${r.retrieval.rank})` : ""}; expected scores ${JSON.stringify(r.retrieval.expectedScores ?? {})}${r.requireAllSources ? ` — all required; in top 4: ${(r.retrieval.expectedInTopK ?? []).join(", ") || "none"}` : ""}`, "");
    const pl = r.retrieval.pipeline;
    if (pl) L.push(`**Sent to the model (${pl.mode}):** ${pl.selected.join(", ") || "no articles"} → **${pl.status}**${pl.relevance ? ` · rerank scores ${JSON.stringify(pl.relevance)}` : ""}${pl.rewrittenQuery ? ` · rewritten query: "${pl.rewrittenQuery}"` : ""}${pl.errors.length ? ` · ⚠️ ${pl.errors.join("; ")}` : ""}`, "");
    if (r.retrieval.top) L.push(`**Dense top 4:** ${r.retrieval.top.map((t) => `${t.rank}. ${t.source} (${t.score})`).join(" · ")} — retrieval ${r.retrieval.retrievalMs} ms (embed ${r.retrieval.embedMs}, rank ${r.retrieval.rankMs})`, "");
    if (r.retrieval.error) L.push(`**Retrieval error:** ${r.retrieval.error}`, "");
    if (r.retrieval.warning) L.push(`**Warning:** ${r.retrieval.warning}`, "");
    if (r.context.status !== "n/a") {
      L.push(`**Patient context:** ${r.context.status}${r.context.missingFacts.length ? `; missing: ${r.context.missingFacts.map((f) => `"${f}"`).join(", ")}` : ""}${r.context.presentForbidden.length ? `; should not contain: ${r.context.presentForbidden.map((f) => `"${f}"`).join(", ")}` : ""}`, "");
    }
    if (r.knownLimitation) L.push(`**Known limitation:** ${r.knownLimitation}`, "");
    L.push(`**Expected behaviour:** ${r.expectedBehaviour}`, "");
    if (r.answer.text) {
      L.push(`**Answer** (${r.answer.generationMs} ms generation, ${r.answer.endToEndMs} ms end to end) — score in scoring-sheet.csv:`, "", ...r.answer.text.split("\n").map((l) => `> ${l}`), "");
      L.push(`**Sources shown to the user (cited):** ${r.answer.sourcesShown?.length ? r.answer.sourcesShown.join("; ") : "none"} · retrieved: ${r.answer.retrievedTitles?.join("; ") ?? "–"}${r.answer.citationPrecision != null ? ` · citation precision ${r.answer.citationPrecision}` : ""}${r.answer.numericDates?.length ? ` · ⚠️ numeric dates: ${r.answer.numericDates.join(", ")}` : ""}`, "");
      if (r.answer.judge) L.push(`*LLM judge (ADVISORY ONLY, not a result):* ${"error" in r.answer.judge ? r.answer.judge.error : `groundedness ${r.answer.judge.groundedness}, correctness ${r.answer.judge.correctness}, attribution ${r.answer.judge.attribution}, safety ${r.answer.judge.safety} — ${r.answer.judge.rationale}`}`, "");
    } else if (r.answer.status !== "not run") L.push(`**Answer:** ${r.answer.status}${r.answer.error ? ` — ${r.answer.error}` : ""}`, "");
  }
  if (report.comparison) L.push("", report.comparison);
  return L.join("\n") + "\n";
}
