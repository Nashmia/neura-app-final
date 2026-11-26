/**
 * Voice tone of spoken check-in answers, from a speech-emotion model (wav2vec2 fine-tuned on the
 * SUPERB emotion-recognition task, run on the device by lib/ml). The model scores how the voice
 * sounds (neutral, happy, angry, sad), not what is said.
 * Stored as probability × seconds sums so recordings and answers add up like the speech markers do.
 * A tracking aid on short clips: the model was trained on acted English speech, not older adults.
 */

export const VOICE_LABELS = ["neu", "hap", "ang", "sad"] as const;
export type VoiceLabel = (typeof VOICE_LABELS)[number];
export const VOICE_LABEL_NAMES: Record<VoiceLabel, string> = { neu: "Neutral", hap: "Happy", ang: "Tense", sad: "Sad" };

export type VoiceTone = { recordings: number; seconds: number } & Record<VoiceLabel, number>;

/** Less speech than this isn't summarised: a second or two of audio says little about tone. */
export const MIN_TONE_SECONDS = 2;
export const VOICE_TONE_LIMITS = { maxSeconds: 3600, maxRecordings: 200 };

const round = (n: number) => Math.round(n * 100) / 100;

/** One recording's tone from the model's per-label probabilities and the recording's length. */
export function toneFromScores(scores: Partial<Record<VoiceLabel, number>>, seconds: number): VoiceTone {
  const total = VOICE_LABELS.reduce((s, l) => s + (scores[l] ?? 0), 0) || 1;
  const tone = { recordings: 1, seconds: round(seconds) } as VoiceTone;
  for (const l of VOICE_LABELS) tone[l] = round(((scores[l] ?? 0) / total) * seconds);
  return tone;
}

export function combineVoiceTone(parts: (VoiceTone | null | undefined)[]): VoiceTone | null {
  const present = parts.filter((p): p is VoiceTone => Boolean(p?.recordings));
  if (!present.length) return null;
  const tone = { recordings: 0, seconds: 0, neu: 0, hap: 0, ang: 0, sad: 0 } as VoiceTone;
  for (const p of present) {
    tone.recordings += p.recordings;
    tone.seconds = round(tone.seconds + p.seconds);
    for (const l of VOICE_LABELS) tone[l] = round(tone[l] + p[l]);
  }
  return tone;
}

export type VoiceToneSummary = { shares: Record<VoiceLabel, number>; dominant: VoiceLabel; seconds: number };

/** Share of speaking time per tone (0–1) and the main tone. Null when there's too little speech. */
export function summarizeVoiceTone(tone: VoiceTone | null | undefined): VoiceToneSummary | null {
  if (!tone || tone.seconds < MIN_TONE_SECONDS) return null;
  const sum = VOICE_LABELS.reduce((s, l) => s + tone[l], 0) || 1;
  const shares = Object.fromEntries(VOICE_LABELS.map((l) => [l, round(tone[l] / sum)])) as Record<VoiceLabel, number>;
  const dominant = VOICE_LABELS.reduce((best, l) => (shares[l] > shares[best] ? l : best), "neu" as VoiceLabel);
  return { shares, dominant, seconds: tone.seconds };
}
