/** Metrics for the ML evaluation. Pure functions, unit-tested in tests/eval-metrics.test.ts. */

export type Binary = { tp: number; fp: number; fn: number; tn: number };

export function binaryCounts(gold: boolean[], predicted: boolean[]): Binary {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 };
  gold.forEach((g, i) => {
    const p = predicted[i];
    if (g && p) c.tp++;
    else if (!g && p) c.fp++;
    else if (g && !p) c.fn++;
    else c.tn++;
  });
  return c;
}

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);
export const precision = (c: Binary) => ratio(c.tp, c.tp + c.fp);
export const recall = (c: Binary) => ratio(c.tp, c.tp + c.fn);
export const f1 = (c: Binary) => {
  const p = precision(c);
  const r = recall(c);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
};
export const accuracy = (c: Binary) => ratio(c.tp + c.tn, c.tp + c.tn + c.fp + c.fn);
export const falsePositiveRate = (c: Binary) => ratio(c.fp, c.fp + c.tn);

/** Confusion matrix as rows = gold label, columns = predicted label. */
export function confusion(labels: string[], gold: string[], predicted: string[]): number[][] {
  const index = new Map(labels.map((l, i) => [l, i]));
  const matrix = labels.map(() => labels.map(() => 0));
  gold.forEach((g, i) => matrix[index.get(g)!][index.get(predicted[i])!]++);
  return matrix;
}

/** Per-class precision/recall/F1 and the macro average over `labels`. */
export function perClass(labels: string[], gold: string[], predicted: string[]) {
  const rows = labels.map((label) => {
    const c = binaryCounts(gold.map((g) => g === label), predicted.map((p) => p === label));
    return { label, support: gold.filter((g) => g === label).length, precision: precision(c), recall: recall(c), f1: f1(c) };
  });
  const macroF1 = rows.reduce((s, r) => s + r.f1, 0) / rows.length;
  const acc = gold.filter((g, i) => g === predicted[i]).length / gold.length;
  return { rows, macroF1, accuracy: acc };
}

/* ------------------------------ ranking ------------------------------ */

const STOP = new Set("a an and the of to in on for at by with from is are was were be it its this that her his she he they them their i me my we our you your not no".split(" "));
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, ""));
}

/** Okapi BM25 ranking of `docs` for `query` (the keyword-search baseline). Returns doc indices, best first. */
export function bm25Rank(query: string, docs: string[], k1 = 1.2, b = 0.75): { index: number; score: number }[] {
  const docTokens = docs.map(tokens);
  const avgLen = docTokens.reduce((s, d) => s + d.length, 0) / docTokens.length;
  const df = new Map<string, number>();
  docTokens.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const q = tokens(query);
  return docTokens
    .map((d, index) => {
      let score = 0;
      for (const term of q) {
        const f = d.filter((t) => t === term).length;
        if (!f) continue;
        const idf = Math.log(1 + (docs.length - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avgLen)));
      }
      return { index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/** Share of the relevant ids found in the top k of `ranked`. */
export function recallAtK(ranked: string[], relevant: string[], k: number): number {
  const top = new Set(ranked.slice(0, k));
  return relevant.filter((r) => top.has(r)).length / relevant.length;
}

/** 1 / rank of the first relevant id (0 if none is ranked). */
export function reciprocalRank(ranked: string[], relevant: string[]): number {
  const i = ranked.findIndex((id) => relevant.includes(id));
  return i < 0 ? 0 : 1 / (i + 1);
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
