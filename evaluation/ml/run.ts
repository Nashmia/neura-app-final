/**
 * Evaluation of the machine-learning features added in Nov 2026.   npm run eval:ml -- [flags]
 *
 *   --only=fact,mood,safety,search   Run only these studies (default: all four).
 *   --safety-delay=S                 Seconds between gpt-oss-safeguard calls (default 21: Groq free tier allows 3 a minute).
 *   --no-gemini-safety               Skip the Gemini safety-fallback comparison (saves 34 lite-model calls).
 *   --embed-delay=MS                 Milliseconds between embedding calls (default 700).
 *   --label=TEXT                     Description shown at the top of the report.
 *
 * Studies (each compares the model with a simpler baseline on a labelled set in ./cases.ts):
 *   fact    DeBERTa-v3 NLI fact-checker vs word overlap, on 48 sentences against 8 knowledge-base articles
 *   mood    Mood suggestion: keywords, VADER, the DistilRoBERTa emotion model, and the live combination, on 58 notes
 *   safety  gpt-oss-safeguard-20b vs the Gemini fallback on 34 messages; Llama Prompt Guard on 8 injections + 34 benign
 *   search  Gemini-embedding search vs BM25 keyword search, 12 queries over 30 notes
 *
 * The on-device models run here in Node with the same Transformers.js code and model files as the browser.
 * Writes evaluation/reports/ml-<timestamp>/{report.md, report.json}. Reads no app database.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { AutoModelForSequenceClassification, AutoTokenizer, pipeline, softmax, type TextClassificationPipeline } from "@huggingface/transformers";
import { knowledgeBase } from "../../scripts/knowledge-base";
import { factCheck } from "../../lib/ml/fact-check";
import type { NliPair, NliScores } from "../../lib/ml/protocol";
import { moodFromEmotion, moodFromKeywords, moodFromSentiment, sentimentOf, suggestMood, type Emotion } from "../../lib/mood-suggest";
import { cosineSimilarity, embedText } from "../../lib/embeddings";
import { classifyWithGemini, classifyWithSafeguard, injectionScore, INJECTION_THRESHOLD, type SafetyCategory } from "../../lib/safety";
import { factCases, injectionCases, moodCases, safetyCases, searchNotes, searchQueries, type FactCase, type MoodCase, type SafetyCase } from "./cases";
import { accuracy, binaryCounts, bm25Rank, confusion, f1, falsePositiveRate, mean, pct, perClass, precision, recall, recallAtK, reciprocalRank, tokens } from "./metrics";

config({ path: join(__dirname, "..", "..", ".env.local"), quiet: true });

const arg = (name: string) => process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const argValue = (name: string, fallback: string) => arg(name)?.split("=").slice(1).join("=") || fallback;
const only = new Set(argValue("only", "fact,mood,safety,search").split(",").map((s) => s.trim()));
const settings = {
  only: [...only],
  safetyDelaySec: Number(argValue("safety-delay", "21")),
  geminiSafety: !arg("no-gemini-safety"),
  embedDelayMs: Number(argValue("embed-delay", "700")),
  label: argValue("label", "Evaluation of the ML features (fact-checker, mood suggestion, safety screen, journal search)"),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (s: string) => console.log(s);
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const sections: string[] = [];
const data: Record<string, unknown> = {};

/* ------------------------------ fact-checker ------------------------------ */

async function factStudy() {
  log("\n[fact] loading DeBERTa-v3 NLI (Xenova/nli-deberta-v3-xsmall, q8)…");
  const id = "Xenova/nli-deberta-v3-xsmall";
  const tokenizer = await AutoTokenizer.from_pretrained(id);
  const model = await AutoModelForSequenceClassification.from_pretrained(id, { dtype: "q8" });
  const labels = (model.config as unknown as { id2label: Record<string, string> }).id2label;
  let pairsScored = 0;
  // Same batching and label handling as lib/ml/worker.ts.
  const nli = async (pairs: NliPair[]): Promise<NliScores[]> => {
    const out: NliScores[] = [];
    for (let i = 0; i < pairs.length; i += 8) {
      const batch = pairs.slice(i, i + 8);
      const inputs = tokenizer(batch.map((p) => p.premise), { text_pair: batch.map((p) => p.hypothesis), padding: true, truncation: true });
      const { logits } = await model(inputs);
      for (let b = 0; b < batch.length; b++) {
        const probs = softmax(Array.from(logits[b].data as Float32Array));
        const by = Object.fromEntries(probs.map((p, j) => [labels[j], p]));
        out.push({ entailment: by.entailment ?? 0, contradiction: by.contradiction ?? 0, neutral: by.neutral ?? 0 });
      }
    }
    pairsScored += pairs.length;
    return out;
  };

  const rows: (FactCase & { nliScore: number; overlap: number; ms: number })[] = [];
  const started = Date.now();
  for (const c of factCases) {
    const article = knowledgeBase.find((a) => a.source === c.source)!.text;
    const t = Date.now();
    const { checks } = await factCheck(c.sentence, [article], nli);
    const ms = Date.now() - t;
    const nliScore = checks[0]?.score ?? 0;
    // Baseline: share of the sentence's content words that appear anywhere in the article.
    const articleWords = new Set(tokens(article));
    const claimWords = tokens(c.sentence);
    const overlap = claimWords.filter((w) => articleWords.has(w)).length / Math.max(1, claimWords.length);
    rows.push({ ...c, nliScore, overlap: Math.round(overlap * 100) / 100, ms });
  }
  const gold = rows.map((r) => r.label === "supported");

  const sweep = (name: string, scores: number[], thresholds: number[], live?: number) =>
    thresholds.map((t) => {
      const c = binaryCounts(gold, scores.map((s) => s >= t));
      return [`${name} ≥ ${t}${t === live ? " (live setting)" : ""}`, pct(precision(c)), pct(recall(c)), pct(f1(c)), pct(accuracy(c)), `${c.tp}/${c.fp}/${c.fn}/${c.tn}`];
    });
  const nliSweep = sweep("NLI entailment", rows.map((r) => r.nliScore), [0.3, 0.5, 0.7, 0.9], 0.5);
  const overlapSweep = sweep("Word overlap", rows.map((r) => r.overlap), [0.5, 0.7, 0.9]);
  const live = binaryCounts(gold, rows.map((r) => r.nliScore >= 0.5));
  const byKind = (kind: string) => {
    const sub = rows.filter((r) => r.kind === kind);
    return `${sub.filter((r) => r.nliScore < 0.5).length}/${sub.length}`;
  };
  const misses = rows.filter((r) => (r.label === "supported") !== r.nliScore >= 0.5);

  sections.push(`## 1. Fact-checker (DeBERTa-v3 NLI)

**Task:** decide whether a sentence is supported by a knowledge-base article, as the Care Assistant's fact-check does for each sentence of an answer. **Set:** ${factCases.length} sentences, 3 supported and 3 unsupported per article over 8 articles. "Supported" is the positive class.

**Result (live setting, entailment ≥ 0.5):** precision **${pct(precision(live))}**, recall **${pct(recall(live))}**, F1 **${pct(f1(live))}**, accuracy ${pct(accuracy(live))}. Unsupported sentences correctly left unmarked: ${byKind("contradicts")} that contradict the article, ${byKind("not-stated")} that the article doesn't mention. Mean time per sentence: ${Math.round(mean(rows.map((r) => r.ms)))} ms (${pairsScored} sentence–passage pairs scored in ${((Date.now() - started) / 1000).toFixed(1)} s on this machine's CPU).

${table(["Method / threshold", "Precision", "Recall", "F1", "Accuracy", "TP/FP/FN/TN"], [...nliSweep, ...overlapSweep])}

Word overlap is the baseline: a sentence counts as supported when that share of its content words appears in the article.

**Errors at the live setting (${misses.length}):**

${table(["Id", "Gold", "NLI score", "Overlap", "Sentence"], misses.map((r) => [r.id, r.label, r.nliScore.toFixed(2), r.overlap.toFixed(2), r.sentence]))}`);
  data.fact = { rows };
}

/* --------------------------------- mood --------------------------------- */

async function moodStudy() {
  log("\n[mood] loading DistilRoBERTa emotion model (MicahB/emotion_text_classifier, q8)…");
  const classify = (await (pipeline as unknown as (t: string, m: string, o: object) => Promise<TextClassificationPipeline>)("text-classification", "MicahB/emotion_text_classifier", { dtype: "q8" }));
  const rows: (MoodCase & { emotion: string; compound: number; keywordHit: boolean; predictions: Record<string, string> })[] = [];
  for (const c of moodCases) {
    const [top] = (await classify(c.text, { top_k: 1 })) as Emotion[];
    const compound = sentimentOf(c.text);
    rows.push({
      ...c,
      emotion: `${top.label} ${top.score.toFixed(2)}`,
      compound: Math.round(compound * 100) / 100,
      keywordHit: Boolean(moodFromKeywords(c.text)),
      predictions: {
        "VADER only": moodFromSentiment(compound) ?? "none",
        "Keywords only": moodFromKeywords(c.text)?.tag ?? "none",
        "Emotion model only": moodFromEmotion(top) ?? "none",
        "Keywords + VADER (first version)": suggestMood(c.text)?.tag ?? "none",
        "Keywords + emotion model + VADER (live)": suggestMood(c.text, top)?.tag ?? "none",
      } as Record<string, string>,
    });
  }
  const labels = ["Happy", "Calm", "Anxious", "Confused", "Tired", "none"];
  const gold = rows.map((r) => r.label);
  const methods = Object.keys(rows[0].predictions);
  const summary = methods.map((m) => {
    const predicted = rows.map((r) => r.predictions[m]);
    const res = perClass(labels, gold, predicted);
    const suggested = predicted.filter((p) => p !== "none").length;
    const correctWhenSuggested = rows.filter((r) => r.predictions[m] !== "none" && r.predictions[m] === r.label).length;
    return [m, pct(res.accuracy), pct(res.macroF1), `${suggested}/${rows.length}`, pct(suggested ? correctWhenSuggested / suggested : 0)];
  });
  const liveName = methods[methods.length - 1];
  const live = perClass(labels, gold, rows.map((r) => r.predictions[liveName]));
  const matrix = confusion(labels, gold, rows.map((r) => r.predictions[liveName]));
  const subset = (hit: boolean) => {
    const sub = rows.filter((r) => r.keywordHit === hit);
    return `${sub.filter((r) => r.predictions[liveName] === r.label).length}/${sub.length}`;
  };
  const wrong = rows.filter((r) => r.predictions[liveName] !== r.label);

  sections.push(`## 2. Journal mood suggestion

**Task:** suggest the mood tag a caregiver would pick for a note (Happy, Calm, Anxious, Confused, Tired), or nothing for a note with no mood in it. **Set:** ${moodCases.length} notes, 10 per mood and 8 with no mood. Coverage = how often a suggestion is made; "precision when suggesting" = how often a suggestion is right.

${table(["Method", "Accuracy", "Macro-F1", "Coverage", "Precision when suggesting"], summary)}

Live method per class:

${table(["Mood", "Notes", "Precision", "Recall", "F1"], live.rows.map((r) => [r.label, r.support, pct(r.precision), pct(r.recall), pct(r.f1)]))}

Confusion matrix of the live method (rows = correct mood, columns = suggested):

${table(["", ...labels], labels.map((l, i) => [`**${l}**`, ...matrix[i]]))}

Live method on notes that contain one of its keywords: ${subset(true)} correct; on notes without one: ${subset(false)} correct. **Caution:** the keyword list was written before these notes, by the same developer, so the keyword rows may be optimistic.

**Errors of the live method (${wrong.length}):**

${table(["Id", "Correct", "Suggested", "Emotion model", "VADER", "Note"], wrong.map((r) => [r.id, r.label, r.predictions[liveName], r.emotion, r.compound, r.text]))}`);
  data.mood = { rows };
}

/* -------------------------------- safety -------------------------------- */

/** Retries on Groq's per-minute limit (429), waiting as long as Groq asks. */
async function withRateLimitRetry<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") || attempt === 3) {
        log(`  ${label}: ${message.slice(0, 120)}`);
        return null;
      }
      await sleep(25_000);
    }
  }
  return null;
}

async function safetyStudy() {
  const categories: SafetyCategory[] = ["none", "self_harm", "harm_to_others", "medical_emergency"];
  const rows: (SafetyCase & { safeguard: SafetyCategory | null; gemini: SafetyCategory | null; injection: number | null; safeguardMs: number })[] = [];
  log(`\n[safety] ${safetyCases.length} messages; ${settings.safetyDelaySec}s between gpt-oss-safeguard calls (Groq free tier: 3 a minute)…`);
  for (const [i, c] of safetyCases.entries()) {
    const t = Date.now();
    const safeguard = await withRateLimitRetry(() => classifyWithSafeguard(c.text), `${c.id} safeguard`);
    const safeguardMs = Date.now() - t;
    const gemini = settings.geminiSafety ? await withRateLimitRetry(() => classifyWithGemini(c.text), `${c.id} gemini`) : null;
    const injection = await withRateLimitRetry(() => injectionScore(c.text), `${c.id} prompt guard`);
    rows.push({ ...c, safeguard, gemini, injection, safeguardMs });
    log(`  ${c.id} ${c.label.padEnd(17)} safeguard=${safeguard} gemini=${gemini}`);
    if (i < safetyCases.length - 1) await sleep(settings.safetyDelaySec * 1000);
  }
  const injections: { id: string; text: string; injection: number | null }[] = [];
  for (const c of injectionCases) {
    injections.push({ ...c, injection: await withRateLimitRetry(() => injectionScore(c.text), `${c.id} prompt guard`) });
    await sleep(1000);
  }

  const evaluate = (name: string, key: "safeguard" | "gemini") => {
    const valid = rows.filter((r) => r[key] !== null);
    if (!valid.length) return null;
    const flagged = binaryCounts(valid.map((r) => r.label !== "none"), valid.map((r) => r[key] !== "none"));
    const multi = perClass(categories, valid.map((r) => r.label), valid.map((r) => r[key] as string));
    return { name, key, valid, flagged, multi };
  };
  const results = [evaluate("gpt-oss-safeguard-20b (Groq, live)", "safeguard"), settings.geminiSafety ? evaluate("Gemini lite (fallback)", "gemini") : null].filter(Boolean) as NonNullable<ReturnType<typeof evaluate>>[];
  const pg = binaryCounts(
    [...injections.map(() => true), ...rows.map(() => false)],
    [...injections.map((r) => (r.injection ?? 0) >= INJECTION_THRESHOLD), ...rows.map((r) => (r.injection ?? 0) >= INJECTION_THRESHOLD)]
  );
  const misses = rows.filter((r) => r.safeguard !== null && r.safeguard !== r.label);

  sections.push(`## 3. Safety screen

**Task:** put each Care Assistant message into one of: none, self_harm, harm_to_others, medical_emergency. **Set:** ${safetyCases.length} messages (14 safe, several deliberately close to the line such as venting or end-of-life planning; 7 self-harm; 6 harm to others; 7 medical emergencies). "Flagged" = any category other than none, which is what shows the crisis card.

${table(["Model", "Answered", "Crisis recall (flagged)", "False alarms on safe messages", "Flag precision", "4-class accuracy", "Macro-F1"], results.map((r) => [r.name, `${r.valid.length}/${rows.length}`, pct(recall(r.flagged)), `${r.flagged.fp}/${r.valid.filter((v) => v.label === "none").length} (${pct(falsePositiveRate(r.flagged))})`, pct(precision(r.flagged)), pct(r.multi.accuracy), pct(r.multi.macroF1)]))}

Per category (live model):

${results[0] ? table(["Category", "Messages", "Precision", "Recall"], results[0].multi.rows.map((r) => [r.label, r.support, pct(r.precision), pct(r.recall)])) : "Live model unavailable during this run."}

Mean live-model latency: ${Math.round(mean(rows.map((r) => r.safeguardMs)))} ms (includes any rate-limit waits).

**Prompt injection (Llama Prompt Guard 2, 86M; flagged at ≥ ${INJECTION_THRESHOLD}):** detected ${pg.tp}/${injections.length} injection attempts; ${pg.fp}/${rows.length} ordinary messages wrongly flagged.

${table(["Id", "Injection score", "Text"], injections.map((r) => [r.id, r.injection === null ? "n/a" : r.injection.toFixed(3), r.text]))}

**Live-model disagreements with the labels (${misses.length}):**

${table(["Id", "Label", "gpt-oss-safeguard", "Gemini", "Message"], misses.map((r) => [r.id, r.label, r.safeguard ?? "n/a", r.gemini ?? "n/a", r.text]))}`);
  data.safety = { rows, injections };
}

/* -------------------------------- search -------------------------------- */

async function searchStudy() {
  log(`\n[search] embedding ${searchNotes.length} notes and ${searchQueries.length} queries with gemini-embedding-001…`);
  const noteVectors: number[][] = [];
  for (const n of searchNotes) {
    noteVectors.push(await embedText(n.text));
    await sleep(settings.embedDelayMs);
  }
  type Scores = { r3: number; r5: number; rr: number; hit1: number };
  const rows: ((typeof searchQueries)[number] & { semanticTop: string[]; keywordTop: string[]; semantic: Scores; keyword: Scores & { found: number } })[] = [];
  for (const q of searchQueries) {
    const qv = await embedText(q.query);
    await sleep(settings.embedDelayMs);
    const semantic = searchNotes.map((n, i) => ({ id: n.id, score: cosineSimilarity(qv, noteVectors[i]) })).sort((a, b) => b.score - a.score).map((r) => r.id);
    const keyword = bm25Rank(q.query, searchNotes.map((n) => n.text)).filter((r) => r.score > 0).map((r) => searchNotes[r.index].id);
    rows.push({
      ...q,
      semanticTop: semantic.slice(0, 5),
      keywordTop: keyword.slice(0, 5),
      semantic: { r3: recallAtK(semantic, q.relevant, 3), r5: recallAtK(semantic, q.relevant, 5), rr: reciprocalRank(semantic, q.relevant), hit1: q.relevant.includes(semantic[0]) ? 1 : 0 },
      keyword: { r3: recallAtK(keyword, q.relevant, 3), r5: recallAtK(keyword, q.relevant, 5), rr: reciprocalRank(keyword, q.relevant), hit1: keyword[0] && q.relevant.includes(keyword[0]) ? 1 : 0, found: keyword.length },
    });
  }
  const agg = (k: "semantic" | "keyword") => [pct(mean(rows.map((r) => r[k].hit1))), pct(mean(rows.map((r) => r[k].r3))), pct(mean(rows.map((r) => r[k].r5))), mean(rows.map((r) => r[k].rr)).toFixed(3)];
  sections.push(`## 4. Journal search by meaning

**Task:** find the notes relevant to a caregiver's search. **Set:** ${searchQueries.length} queries over ${searchNotes.length} notes, each query with 1–4 relevant notes, mostly worded differently from the notes.

${table(["Method", "Hit@1", "Recall@3", "Recall@5", "MRR"], [["Gemini embeddings + cosine (live)", ...agg("semantic")], ["BM25 keyword search (baseline)", ...agg("keyword")]])}

${table(["Query", "Relevant", "Embeddings top 3", "R@3", "Keyword top 3", "R@3"], rows.map((r) => [r.query, r.relevant.join(" "), r.semanticTop.slice(0, 3).join(" "), pct(r.semantic.r3), r.keywordTop.slice(0, 3).join(" ") || "(no match)", pct(r.keyword.r3)]))}`);
  data.search = { rows };
}

/* --------------------------------- main --------------------------------- */

async function main() {
  const startedAt = new Date();
  const commit = (() => {
    try {
      return execSync("git rev-parse --short HEAD").toString().trim() + (execSync("git status --porcelain").toString().trim() ? " (with uncommitted changes)" : "");
    } catch {
      return "unknown";
    }
  })();
  if (only.has("fact")) await factStudy();
  if (only.has("mood")) await moodStudy();
  if (only.has("safety")) await safetyStudy();
  if (only.has("search")) await searchStudy();

  const stamp = startedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join(__dirname, "..", "reports", `ml-${stamp}`);
  mkdirSync(dir, { recursive: true });
  const header = `# ML feature evaluation

${settings.label}

- Run: ${startedAt.toISOString()} · commit ${commit} · studies: ${settings.only.join(", ")}
- Test sets: \`evaluation/ml/cases.ts\`. **The labels are drafts written by the developer with an AI assistant; review them before quoting these numbers.**
- Small test sets: one case changes a percentage by 2–3 points (fact-check, mood) or 3–8 points (safety, search). Read differences of a few points as noise.
`;
  writeFileSync(join(dir, "report.md"), [header, ...sections].join("\n\n") + "\n");
  writeFileSync(join(dir, "report.json"), JSON.stringify({ startedAt, commit, settings, ...data }, null, 2));
  log(`\nWrote ${dir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
