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

// The three parts below are exported separately so evaluation/ml can measure each one on its own.

/** The first mood whose keyword the note mentions (not negated), or null. */
export function moodFromKeywords(text: string): { tag: MoodTag; keyword: string } | null {
  const words = text.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) ?? [];
  for (const [tag, keywords] of KEYWORDS) {
    const hit = keywords.find((k) => mentions(words, k));
    if (hit) return { tag, keyword: hit };
  }
  return null;
}

/** Happy / Calm from a VADER compound score; null for neutral or negative. */
export function moodFromSentiment(compound: number): MoodTag | null {
  return compound >= 0.5 ? "Happy" : compound >= 0.05 ? "Calm" : null;
}

/** The mood tag an emotion-model reading maps to, when it is confident enough. */
export function moodFromEmotion(emotion: Emotion): MoodTag | null {
  return emotion.score >= 0.5 ? (EMOTION_TAGS[emotion.label] ?? null) : null;
}

export function sentimentOf(text: string): number {
  return SentimentIntensityAnalyzer.polarity_scores(text).compound;
}

export function suggestMood(text: string, emotion?: Emotion | null): MoodSuggestion | null {
  const clean = text.trim();
  if (clean.split(/\s+/).length < 3) return null; // too short to judge
  const compound = sentimentOf(clean);

  const keyword = moodFromKeywords(clean);
  if (keyword) return { tag: keyword.tag, compound, reason: `mentions "${keyword.keyword}"` };
  const fromEmotion = emotion ? moodFromEmotion(emotion) : null;
  if (emotion && fromEmotion)
    return { tag: fromEmotion, compound, reason: `reads as ${emotion.label} (${Math.round(emotion.score * 100)}%) to the emotion model` };
  if (emotion?.label === "neutral" && emotion.score >= 0.7 && compound < 0.05) return null;
  const fromSentiment = moodFromSentiment(compound);
  if (fromSentiment) return { tag: fromSentiment, compound, reason: fromSentiment === "Happy" ? "the note reads as clearly positive" : "the note reads as mildly positive" };
  return null; // neutral or negative without a clear cause: no guess
}
