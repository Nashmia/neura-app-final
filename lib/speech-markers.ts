/**
 * Speech markers from voice check-in answers.
 *
 * Whisper (via /api/transcribe) returns each word with start/end times. From those timings we derive
 * simple, well-studied features of spontaneous speech that tend to change with cognitive decline:
 * slower speech, more and longer pauses, a longer delay before answering, more filler words ("um",
 * "uh"), repeated words, and a smaller range of words. They are tracking signals to compare with the
 * same patient's earlier check-ins, never a diagnosis.
 *
 * Shared by the server (computing and storing) and the browser (combining several recordings into one
 * answer and displaying them), so this file must stay free of server-only imports.
 */

export type WordTiming = { word: string; start: number; end: number };

/** Raw totals, so several recordings or answers can be combined exactly. */
export type SpeechMarkers = {
  recordings: number;
  durationSec: number; // total recording length
  speakingSec: number; // first word start to last word end, summed over recordings
  wordCount: number;
  uniqueWordCount: number; // distinct words within each recording, summed
  pauseCount: number; // silent gaps between words of at least PAUSE_SEC
  longPauseCount: number; // gaps of at least LONG_PAUSE_SEC
  totalPauseSec: number;
  fillerCount: number;
  repetitionCount: number; // a word immediately repeated ("the the")
  totalLatencySec: number; // silence before the first word, summed over recordings
};

/** Readable figures derived from the totals. null when there isn't enough speech to say. */
export type SpeechSummary = {
  speechRateWpm: number | null;
  pausesPerMinute: number | null;
  meanPauseSec: number | null;
  longPauseCount: number;
  responseLatencySec: number | null;
  fillersPer100Words: number | null;
  repetitionCount: number;
  lexicalDiversity: number | null; // distinct words / words (type-token ratio)
  wordCount: number;
  recordings: number;
};

export const PAUSE_SEC = 0.5;
export const LONG_PAUSE_SEC = 2;
const MIN_WORDS = 3;

const FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "ahh", "hmm", "hm", "mm", "mmm", "eh"]);

function normalise(word: string) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
}

function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function emptyMarkers(): SpeechMarkers {
  return { recordings: 0, durationSec: 0, speakingSec: 0, wordCount: 0, uniqueWordCount: 0, pauseCount: 0, longPauseCount: 0, totalPauseSec: 0, fillerCount: 0, repetitionCount: 0, totalLatencySec: 0 };
}

/** Markers for one recording, from Whisper's word timings. Returns null when no words were found. */
export function computeSpeechMarkers(rawWords: WordTiming[], durationSec: number): SpeechMarkers | null {
  const words = rawWords
    .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start)
    .map((w) => ({ ...w, norm: normalise(w.word) }))
    .filter((w) => w.norm)
    .sort((a, b) => a.start - b.start);
  if (!words.length) return null;

  // Whisper rarely leaves gaps between words: it stretches the words either side of a silence to
  // cover it (a 2.5 s pause showed up as "is..." lasting 1.6 s and "Saturday." lasting 2.9 s). So
  // the time a word runs beyond a generous estimate of how long it takes to say counts as pause
  // too. Whisper's punctuation says which side: a word ending in . , ... etc. is followed by the
  // silence, any other word is preceded by it. Each overrun is counted at one boundary only.
  const overrun = words.map((w) => Math.max(0, w.end - w.start - (0.15 + 0.08 * w.norm.length)));
  const endsClause = words.map((w) => /[.,;:!?…-]$/.test(w.word.trim()));
  let pauseCount = 0;
  let longPauseCount = 0;
  let totalPauseSec = 0;
  let repetitionCount = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.max(0, words[i].start - words[i - 1].end) + (endsClause[i - 1] ? overrun[i - 1] : 0) + (endsClause[i] ? 0 : overrun[i]);
    if (gap >= PAUSE_SEC) {
      pauseCount++;
      totalPauseSec += gap;
      if (gap >= LONG_PAUSE_SEC) longPauseCount++;
    }
    if (words[i].norm === words[i - 1].norm && !FILLERS.has(words[i].norm)) repetitionCount++;
  }
  const contentWords = words.filter((w) => !FILLERS.has(w.norm));

  return {
    recordings: 1,
    durationSec: round(Math.max(durationSec, words.at(-1)!.end), 2),
    speakingSec: round(Math.max(words.at(-1)!.end - words[0].start, 0.1), 2),
    wordCount: words.length,
    uniqueWordCount: new Set(contentWords.map((w) => w.norm)).size,
    pauseCount,
    longPauseCount,
    totalPauseSec: round(totalPauseSec, 2),
    fillerCount: words.length - contentWords.length,
    repetitionCount,
    totalLatencySec: round(Math.max(words[0].start, 0), 2),
  };
}

/** Adds markers together (several recordings in one answer, or all voice answers in a check-in). */
export function combineSpeechMarkers(list: (SpeechMarkers | null | undefined)[]): SpeechMarkers | null {
  const present = list.filter((m): m is SpeechMarkers => Boolean(m && m.recordings > 0));
  if (!present.length) return null;
  const total = emptyMarkers();
  for (const m of present) for (const key of Object.keys(total) as (keyof SpeechMarkers)[]) total[key] += m[key];
  for (const key of ["durationSec", "speakingSec", "totalPauseSec", "totalLatencySec"] as const) total[key] = round(total[key], 2);
  return total;
}

export function summarizeSpeech(m: SpeechMarkers): SpeechSummary {
  const enough = m.wordCount >= MIN_WORDS;
  const contentWords = m.wordCount - m.fillerCount;
  return {
    speechRateWpm: enough ? Math.round(m.wordCount / (m.speakingSec / 60)) : null,
    pausesPerMinute: enough ? round(m.pauseCount / (m.speakingSec / 60)) : null,
    meanPauseSec: m.pauseCount ? round(m.totalPauseSec / m.pauseCount) : enough ? 0 : null,
    longPauseCount: m.longPauseCount,
    responseLatencySec: m.recordings ? round(m.totalLatencySec / m.recordings) : null,
    fillersPer100Words: enough ? round((m.fillerCount / m.wordCount) * 100) : null,
    repetitionCount: m.repetitionCount,
    // Type-token ratio falls naturally as answers get longer, so only report it from 10 words up.
    lexicalDiversity: contentWords >= 10 ? round(m.uniqueWordCount / contentWords, 2) : null,
    wordCount: m.wordCount,
    recordings: m.recordings,
  };
}

/** Bounds for validating markers that arrive from the browser with a quiz answer. */
export const SPEECH_LIMITS = { maxRecordings: 20, maxSeconds: 60 * 20, maxCount: 5000 } as const;
