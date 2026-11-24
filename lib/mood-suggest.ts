import { SentimentIntensityAnalyzer } from "vader-sentiment";
import type { MoodTag } from "@/lib/types";

/**
 * Suggests a mood tag for a journal note. VADER (a lexicon-based sentiment model, no training or API call)
 * scores how positive or negative the note is; it cannot tell "anxious" from "tired", so a few keyword
 * rules pick the specific negative tags first. Only a suggestion: the caregiver chooses whether to use it.
 */

export type MoodSuggestion = { tag: MoodTag; compound: number; reason: string };

// Checked in order; the first tag with a (non-negated) keyword wins.
const KEYWORDS: [MoodTag, string[]][] = [
  ["Confused", ["confused", "confusion", "disoriented", "muddled", "forgot", "forgetful", "lost", "didn't recognise", "didn't recognize", "did not recognise", "did not recognize", "repeating", "kept asking", "mixed up"]],
  ["Anxious", ["anxious", "anxiety", "worried", "worrying", "agitated", "agitation", "restless", "scared", "afraid", "frightened", "nervous", "panic", "panicked", "upset", "distressed", "on edge", "pacing"]],
  ["Tired", ["tired", "sleepy", "drowsy", "exhausted", "fatigued", "fatigue", "worn out", "napped", "napping", "dozed", "dozing", "lethargic", "no energy"]],
];

const NEGATIONS = new Set(["not", "no", "never", "wasn't", "isn't", "didn't", "without", "less"]);

/** True when `phrase` occurs in `words` and none of the two words before it negates it ("not confused"). */
function mentions(words: string[], phrase: string): boolean {
  const target = phrase.split(" ");
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, j) => words[i + j] === t) && !words.slice(Math.max(0, i - 2), i).some((w) => NEGATIONS.has(w))) return true;
  }
  return false;
}

export function suggestMood(text: string): MoodSuggestion | null {
  const clean = text.trim();
  if (clean.split(/\s+/).length < 3) return null; // too short to judge
  const words = clean.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) ?? [];
  const compound = SentimentIntensityAnalyzer.polarity_scores(clean).compound;

  for (const [tag, keywords] of KEYWORDS) {
    const hit = keywords.find((k) => mentions(words, k));
    if (hit) return { tag, compound, reason: `mentions "${hit}"` };
  }
  if (compound >= 0.5) return { tag: "Happy", compound, reason: "the note reads as clearly positive" };
  if (compound >= 0.05) return { tag: "Calm", compound, reason: "the note reads as mildly positive" };
  return null; // neutral or negative without a clear cause: no guess
}
