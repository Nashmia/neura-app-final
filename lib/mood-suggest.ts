import { SentimentIntensityAnalyzer } from "vader-sentiment";
import type { MoodTag } from "@/lib/types";

/**
 * Suggests a mood tag for a journal note. Keyword rules pick the specific tags (Confused, Anxious, Tired)
 * first. Then, when the in-browser emotion model (DistilRoBERTa, lib/ml) has read the note, its emotion
 * decides; otherwise VADER (a lexicon-based sentiment model, no download or API call) scores how
 * positive the note is. Only a suggestion: the caregiver chooses whether to use it.
 */

export type MoodSuggestion = { tag: MoodTag; compound: number; reason: string };
export type Emotion = { label: string; score: number };

// Emotion model labels (Ekman emotions + neutral) that map onto a mood tag.
const EMOTION_TAGS: Record<string, MoodTag> = { fear: "Anxious", anger: "Anxious", disgust: "Anxious", joy: "Happy" };

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

export function suggestMood(text: string, emotion?: Emotion | null): MoodSuggestion | null {
  const clean = text.trim();
  if (clean.split(/\s+/).length < 3) return null; // too short to judge
  const words = clean.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) ?? [];
  const compound = SentimentIntensityAnalyzer.polarity_scores(clean).compound;

  for (const [tag, keywords] of KEYWORDS) {
    const hit = keywords.find((k) => mentions(words, k));
    if (hit) return { tag, compound, reason: `mentions "${hit}"` };
  }
  if (emotion && emotion.score >= 0.5 && EMOTION_TAGS[emotion.label])
    return { tag: EMOTION_TAGS[emotion.label], compound, reason: `reads as ${emotion.label} (${Math.round(emotion.score * 100)}%) to the emotion model` };
  if (emotion?.label === "neutral" && emotion.score >= 0.7 && compound < 0.05) return null;
  if (compound >= 0.5) return { tag: "Happy", compound, reason: "the note reads as clearly positive" };
  if (compound >= 0.05) return { tag: "Calm", compound, reason: "the note reads as mildly positive" };
  return null; // neutral or negative without a clear cause: no guess
}
