/**
 * Before/after comparison of a run against a baseline report folder (default: the Phase 1 baseline).
 * Reads the baseline's report.json and its human-scored scoring-sheet.csv; never modifies them.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { aggregate, type CaseResult, type RunReport } from "./report";

/** Ambiguous numeric dates such as 11/10 or 11/10/2026 (scores like "2/5 on 11 Oct" are not dates). */
export const NUMERIC_DATE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:on|dated|from|since|until|by)\s+\d{1,2}\/\d{1,2}\b/gi;

const CRITERIA = ["groundedness_0_2", "correctness_0_2", "attribution_0_2", "safety_0_2"] as const;

/** Minimal RFC 4180 CSV parser (quoted fields may contain commas, quotes and newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((c) => c !== ""));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const pct = (x: number | null | undefined) => (x == null ? "n/a" : `${Math.round(x * 1000) / 10}%`);
const val = (x: unknown) => (x == null ? "n/a" : String(x));
const numericDates = (text?: string) => (text ? text.match(NUMERIC_DATE) ?? [] : []);

export function compareWithBaseline(current: RunReport, baselineDir: string): string {
  const L: string[] = ["## Before / after: comparison with the baseline", ""];
  const reportPath = join(baselineDir, "report.json");
  if (!existsSync(reportPath)) return [...L, `Baseline not found at ${baselineDir}; no comparison made.`, ""].join("\n");

  const base = JSON.parse(readFileSync(reportPath, "utf8")) as RunReport;
  const b = base.aggregates ?? aggregate(base.results);
  const a = aggregate(current.results);
  L.push(`Baseline: run of ${base.startedAt} at commit \`${base.git.commit.slice(0, 7)}\` (${baselineDir.replace(/\\/g, "/").split("/").slice(-2).join("/")}). Now: commit \`${current.git.commit.slice(0, 7)}\`.`, "");

  L.push("### Retrieval (knowledge-base articles)", "");
  L.push("| Metric | Baseline | Now |", "|---|---|---|");
  L.push(`| Hit rate @4 (all) | ${pct(b.retrieval.hitRateAt4)} (${b.retrieval.hitsAt4}/${b.retrieval.casesWithExpectedArticle}) | ${pct(a.retrieval.hitRateAt4)} (${a.retrieval.hitsAt4}/${a.retrieval.casesWithExpectedArticle}) |`);
  L.push(`| Hit rate @1 (all) | ${pct(b.retrieval.hitRateAt1)} | ${pct(a.retrieval.hitRateAt1)} |`);
  L.push(`| MRR (all) | ${val(b.retrieval.meanReciprocalRank)} | ${val(a.retrieval.meanReciprocalRank)} |`);
  for (const level of ["easy", "hard"] as const) {
    const bb = b.retrieval.byDifficulty?.[level];
    const aa = a.retrieval.byDifficulty[level];
    L.push(`| ${level}: hit @4 / hit @1 / MRR | ${bb ? `${pct(bb.hitRateAt4)} / ${pct(bb.hitRateAt1)} / ${bb.meanReciprocalRank}` : "n/a"} | ${pct(aa.hitRateAt4)} / ${pct(aa.hitRateAt1)} / ${aa.meanReciprocalRank} |`);
    if (bb || aa.failures.length) L.push(`| ${level}: failed cases | ${bb?.failures.join(", ") || "–"} | ${aa.failures.join(", ") || "–"} |`);
  }
  L.push("");

  // Articles actually sent to the model. Before Phase 3 that was always the dense top 4.
  const sentBefore = (stats: typeof b) => stats.pipeline ?? null;
  const p = a.pipeline;
  const bp = sentBefore(b);
  if (p) {
    const before = (level: "all" | "easy" | "hard") => {
      if (bp) return `${pct(bp[level].hitRate)} (${bp[level].hits}/${bp[level].cases}), sent ${bp.meanArticlesSent}`;
      const d = level === "all" ? { hitRate: b.retrieval.hitRateAt4, hits: b.retrieval.hitsAt4, cases: b.retrieval.casesWithExpectedArticle } : { hitRate: b.retrieval.byDifficulty?.[level]?.hitRateAt4 ?? null, hits: b.retrieval.byDifficulty?.[level]?.hitsAt4, cases: b.retrieval.byDifficulty?.[level]?.cases };
      return `${pct(d.hitRate)} (${d.hits}/${d.cases}), dense top 4`;
    };
    L.push("### Articles actually sent to the model", "");
    L.push("| | Baseline | Now |", "|---|---|---|");
    for (const level of ["all", "easy", "hard"] as const) L.push(`| ${level}: expected article sent | ${before(level)} | ${pct(p[level].hitRate)} (${p[level].hits}/${p[level].cases}) |`);
    L.push(`| Precision of sent articles (cases with an expected article) | ${bp ? val(bp.all.meanPrecision) : "≤ 0.25–0.5 (4 sent, usually 1–2 relevant)"} | ${val(p.all.meanPrecision)} |`);
    L.push(`| Articles sent per question | ${bp ? val(bp.meanArticlesSent) : "4"} | ${val(p.meanArticlesSent)} |`);
    L.push(`| Articles sent when no article is needed (patient-data / insufficient-info questions) | ${bp ? `${val(bp.meanArticlesSentWhenNoneExpected)} (${bp.noArticleCasesWithZeroSent} got none)` : "4 (0 got none)"} | ${val(p.meanArticlesSentWhenNoneExpected)} (${p.noArticleCasesWithZeroSent} got none) |`);
    if (p.fallbacks.length) L.push(`| ⚠️ Fell back to dense top 4 | | ${p.fallbacks.join(", ")} |`);
    L.push("");
  }

  L.push("### Patient-context coverage", "");
  L.push("| | Baseline | Now |", "|---|---|---|");
  L.push(`| Pass | ${b.patientContext.pass}/${b.patientContext.checked} | ${a.patientContext.pass}/${a.patientContext.checked} |`);
  L.push(`| Fail (known limitation) | ${b.patientContext.failKnownLimitation} | ${a.patientContext.failKnownLimitation} |`);
  L.push(`| Fail (unexpected) | ${b.patientContext.failUnexpected} | ${a.patientContext.failUnexpected} |`);
  const changed = current.results
    .map((r) => ({ r, old: base.results.find((x) => x.id === r.id) }))
    .filter(({ r, old }) => old && old.context.status !== r.context.status);
  L.push("", changed.length ? `Changed: ${changed.map(({ r, old }) => `${r.id} ${old!.context.status} → ${r.context.status}`).join("; ")}.` : "No per-case changes.", "");

  const answered = current.results.filter((r) => r.answer.text || base.results.find((x) => x.id === r.id)?.answer.text);
  if (answered.length) {
    const sheetPath = join(baselineDir, "scoring-sheet.csv");
    const sheet = existsSync(sheetPath) ? parseCsv(readFileSync(sheetPath, "utf8")) : [];
    const humanTotal = (row?: Record<string, string>) => {
      if (!row || CRITERIA.some((c) => row[c] === "")) return null;
      return CRITERIA.reduce((s, c) => s + Number(row[c]), 0);
    };

    L.push("### Answers (same cases)", "");
    L.push("| Case | Sources shown: baseline → now | Cited now | Numeric dates: baseline → now | Human score baseline (/8) | Human score now |", "|---|---|---|---|---|---|");
    for (const r of answered) {
      const old = base.results.find((x) => x.id === r.id) as CaseResult | undefined;
      const oldDates = numericDates(old?.answer.text);
      const row = sheet.find((s) => s.id === r.id);
      L.push(`| ${r.id} | ${old?.answer.sourcesShown?.length ?? "–"} → ${r.answer.text ? r.answer.sourcesShown?.length ?? 0 : "not run"} | ${r.answer.citedNumbers?.length ? r.answer.citedNumbers.map((n) => `[${n}]`).join("") : "none"} | ${oldDates.join(", ") || "none"} → ${(r.answer.numericDates ?? []).join(", ") || "none"} | ${val(humanTotal(row))} | to be scored (scoring-sheet.csv) |`);
    }
    const totals = Object.fromEntries(CRITERIA.map((c) => [c, sheet.reduce((s, row) => s + (Number(row[c]) || 0), 0)]));
    L.push("", `Baseline human scores per criterion (out of ${sheet.length * 2}): ${CRITERIA.map((c) => `${c.replace("_0_2", "")} ${totals[c]}`).join(", ")}. Score the new answers in this run's scoring-sheet.csv with the same rubric to complete the comparison.`, "");
  }

  L.push("### Latency (median ms)", "");
  L.push("| Stage | Baseline | Now |", "|---|---|---|");
  L.push(`| Retrieval total | ${val(b.latencyMs.retrievalTotal.median)} | ${val(a.latencyMs.retrievalTotal.median)} |`);
  L.push(`| Answer generation | ${val(b.latencyMs.generation.median)} (n=${b.latencyMs.generation.n}) | ${val(a.latencyMs.generation.median)} (n=${a.latencyMs.generation.n}) |`);
  L.push(`| End to end | ${val(b.latencyMs.endToEnd.median)} | ${val(a.latencyMs.endToEnd.median)} |`);
  L.push("", "Generated answers are not deterministic (temperature 0.4) and latency depends on Gemini's load at the time, so small differences are noise.", "");
  return L.join("\n");
}
