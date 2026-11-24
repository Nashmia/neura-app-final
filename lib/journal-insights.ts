import { SentimentIntensityAnalyzer } from "vader-sentiment";
import type { JournalEntry } from "@/lib/types";

/**
 * Journal insights, all plain statistics over data the app already has:
 *   - recurring themes: k-means clustering of the notes' Gemini embeddings, each cluster named by its
 *     most distinctive words (TF-IDF against the other clusters);
 *   - caregiver strain: VADER sentiment of the notes, averaged per week, flagged when recent weeks are
 *     consistently heavy;
 *   - mood anomaly: this week's mood check-ins against the patient's own earlier weeks (z-score).
 * Tracking aids for the caregiver, not assessments.
 */

/* ------------------------------ themes ------------------------------ */

export type Theme = { label: string; words: string[]; count: number; share: number; example: string; entryIds: string[] };

const normalize = (v: number[]) => {
  const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / n);
};
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/** Seeded PRNG so the same notes always give the same themes. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Spherical k-means (cosine similarity) with k-means++ seeding. Returns a cluster index per vector. */
export function kmeans(vectors: number[][], k: number, seed = 42, iterations = 25): number[] {
  const points = vectors.map(normalize);
  const random = mulberry32(seed);
  const centroids: number[][] = [points[Math.floor(random() * points.length)]];
  while (centroids.length < k) {
    const distances = points.map((p) => Math.min(...centroids.map((c) => 1 - dot(p, c))));
    const total = distances.reduce((a, b) => a + b, 0);
    let r = random() * total;
    let next = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        next = i;
        break;
      }
    }
    centroids.push(points[next]);
  }

  let assignment = new Array(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    const nextAssignment = points.map((p) => {
      let best = 0;
      centroids.forEach((c, i) => {
        if (dot(p, c) > dot(p, centroids[best])) best = i;
      });
      return best;
    });
    const changed = nextAssignment.some((a, i) => a !== assignment[i]);
    assignment = nextAssignment;
    centroids.forEach((_, c) => {
      const members = points.filter((_, i) => assignment[i] === c);
      if (members.length) centroids[c] = normalize(members[0].map((_, d) => members.reduce((s, m) => s + m[d], 0)));
    });
    if (!changed && iter > 0) break;
  }
  return assignment;
}

const STOP = new Set(
  "a about after again all also am an and any are as at be because been before being but by can could did didn't do does doing don't down during each even every few for from had has have having he her here hers herself him himself his how i i'm if in into is it it's its itself just like me more most mum mom dad my myself no nor not now of off on once only or other our out over own really same she she's should so some still such than that the their them then there these they this those through to today too under until up very was wasn't we went were what when where which while who why will with would you your got get go going bit lot quite much one two time week again kept wanted want".split(" ")
);

// Common word forms in care notes folded together, so "slept" and "sleep" count as one theme word.
const FORMS: Record<string, string> = {
  slept: "sleep", sleeping: "sleep", sleepy: "sleep", asleep: "sleep", woke: "waking", wake: "waking", awake: "waking",
  ate: "eating", eat: "eating", eaten: "eating", meals: "meal", meal: "meal", lunch: "meals", dinner: "meals", breakfast: "meals",
  nights: "night", evenings: "evening", walked: "walk", walking: "walk", walks: "walk", refused: "refusing", refuse: "refusing",
  medicines: "medication", medicine: "medication", tablets: "medication", pills: "medication",
};

function words(text: string): string[] {
  return (text.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) ?? [])
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => FORMS[w] ?? w);
}

/**
 * Names each cluster by the words that appear in many of its notes but in few other clusters
 * (a TF-IDF over clusters, counting each note once). Words used in only one note are a last resort.
 */
export function labelClusters(texts: string[], assignment: number[], k: number): string[][] {
  const noteWords = texts.map((t) => new Set(words(t)));
  const notesIn = Array.from({ length: k }, (_, c) => noteWords.filter((_, i) => assignment[i] === c));
  const clustersWith = new Map<string, number>();
  notesIn.forEach((notes) => new Set(notes.flatMap((n) => [...n])).forEach((w) => clustersWith.set(w, (clustersWith.get(w) ?? 0) + 1)));
  return notesIn.map((notes) => {
    const df = new Map<string, number>();
    notes.forEach((n) => n.forEach((w) => df.set(w, (df.get(w) ?? 0) + 1)));
    const ranked = [...df.entries()]
      .map(([w, f]) => ({ w, f, score: f * Math.log(1 + k / (clustersWith.get(w) ?? 1)) }))
      .sort((a, b) => b.score - a.score || a.w.localeCompare(b.w));
    const shared = ranked.filter((r) => r.f >= 2);
    return (shared.length ? shared : ranked).slice(0, 3).map((r) => r.w);
  });
}

export const MIN_THEME_NOTES = 6;

/** Recurring themes among notes that have embeddings. Null until there are MIN_THEME_NOTES of them. */
export function findThemes(notes: { id: string; text: string; embedding: number[] }[]): Theme[] | null {
  if (notes.length < MIN_THEME_NOTES) return null;
  const k = Math.min(4, Math.max(2, Math.round(Math.sqrt(notes.length / 2))));
  const assignment = kmeans(notes.map((n) => n.embedding), k);
  const labels = labelClusters(notes.map((n) => n.text), assignment, k);
  return labels
    .map((ws, c) => {
      const members = notes.filter((_, i) => assignment[i] === c);
      // The example is the note closest to the cluster's centre, i.e. the most typical one.
      const centre = normalize(members[0]?.embedding.map((_, d) => members.reduce((s, m) => s + m.embedding[d], 0)) ?? []);
      const typical = [...members].sort((a, b) => dot(normalize(b.embedding), centre) - dot(normalize(a.embedding), centre))[0];
      return {
        label: ws.length ? ws.map((w) => w[0].toUpperCase() + w.slice(1)).join(", ") : "Other",
        words: ws,
        count: members.length,
        share: Math.round((members.length / notes.length) * 100),
        example: typical?.text.slice(0, 160) ?? "",
        entryIds: members.map((m) => m.id),
      };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* -------------------------- caregiver strain -------------------------- */

export type StrainWeek = { week: string; score: number; notes: number };
export type CaregiverStrain = { weeks: StrainWeek[]; elevated: boolean; recentScore: number };

const DAY = 24 * 60 * 60 * 1000;
/** Average VADER score at or below this over the last two weeks (with enough notes) counts as heavy. */
const STRAIN_THRESHOLD = -0.2;

export function sentiment(text: string): number {
  return SentimentIntensityAnalyzer.polarity_scores(text).compound;
}

/** Weekly average sentiment of written notes over the last six weeks, oldest first. */
export function caregiverStrain(entries: Pick<JournalEntry, "text" | "createdAt">[], now = new Date()): CaregiverStrain | null {
  const notes = entries.filter((e) => e.text.trim().split(/\s+/).length >= 3);
  const weeks: StrainWeek[] = [];
  for (let w = 5; w >= 0; w--) {
    const end = now.getTime() - w * 7 * DAY;
    const inWeek = notes.filter((n) => {
      const t = new Date(n.createdAt).getTime();
      return t > end - 7 * DAY && t <= end;
    });
    if (inWeek.length)
      weeks.push({
        week: new Date(end - 6 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        score: Math.round((inWeek.reduce((s, n) => s + sentiment(n.text), 0) / inWeek.length) * 100) / 100,
        notes: inWeek.length,
      });
  }
  if (!weeks.length) return null;
  const recent = notes.filter((n) => now.getTime() - new Date(n.createdAt).getTime() <= 14 * DAY);
  const recentScore = recent.length ? Math.round((recent.reduce((s, n) => s + sentiment(n.text), 0) / recent.length) * 100) / 100 : 0;
  return { weeks, elevated: recent.length >= 3 && recentScore <= STRAIN_THRESHOLD, recentScore };
}

/* ---------------------------- mood anomaly ---------------------------- */

export const MOOD_SCORE: Record<string, number> = { Anxious: 1, Confused: 2, Tired: 3, Calm: 4, Happy: 5 };

export type MoodAnomaly = { thisWeek: number; usual: number; z: number; direction: "lower" | "higher"; unusual: boolean };

/**
 * This week's average mood score (1 = Anxious … 5 = Happy) against the averages of earlier weeks.
 * Needs at least 2 mood entries this week and 3 earlier weeks with entries; null otherwise.
 */
export function moodAnomaly(entries: Pick<JournalEntry, "moodTag" | "createdAt">[], now = new Date()): MoodAnomaly | null {
  const scored = entries.filter((e) => e.moodTag && MOOD_SCORE[e.moodTag]);
  const weekOf = (e: { createdAt: string }) => Math.floor((now.getTime() - new Date(e.createdAt).getTime()) / (7 * DAY));
  const byWeek = new Map<number, number[]>();
  scored.forEach((e) => {
    const w = weekOf(e);
    if (w >= 0 && w < 12) byWeek.set(w, [...(byWeek.get(w) ?? []), MOOD_SCORE[e.moodTag!]]);
  });
  const current = byWeek.get(0);
  const earlier = [...byWeek.entries()].filter(([w]) => w > 0).map(([, s]) => s.reduce((a, b) => a + b, 0) / s.length);
  if (!current || current.length < 2 || earlier.length < 3) return null;

  const thisWeek = current.reduce((a, b) => a + b, 0) / current.length;
  const usual = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const sd = Math.sqrt(earlier.reduce((a, b) => a + (b - usual) ** 2, 0) / (earlier.length - 1));
  const z = (thisWeek - usual) / Math.max(sd, 0.4); // floor: near-identical weeks shouldn't make small changes "unusual"
  const round = (n: number) => Math.round(n * 10) / 10;
  return { thisWeek: round(thisWeek), usual: round(usual), z: round(z), direction: z < 0 ? "lower" : "higher", unusual: Math.abs(z) >= 2 };
}
