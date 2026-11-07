import { test } from "node:test";
import assert from "node:assert/strict";
import { combineSpeechMarkers, computeSpeechMarkers, summarizeSpeech, type WordTiming } from "../lib/speech-markers";

/** Builds word timings from [word, start, end] triples. */
const words = (...w: [string, number, number][]): WordTiming[] => w.map(([word, start, end]) => ({ word, start, end }));

test("measures latency, pauses, fillers and repetitions from word timings", () => {
  const m = computeSpeechMarkers(
    words(
      ["Um,", 1.5, 1.8],
      ["I", 2.0, 2.1],
      ["think", 2.1, 2.4],
      ["it's", 3.0, 3.2], // 0.6 s pause
      ["the", 3.2, 3.3],
      ["the", 3.3, 3.4], // repetition
      ["weekend.", 6.0, 6.5] // 2.6 s long pause
    ),
    7
  )!;
  assert.equal(m.wordCount, 7);
  assert.equal(m.fillerCount, 1);
  assert.equal(m.repetitionCount, 1);
  assert.equal(m.pauseCount, 2);
  assert.equal(m.longPauseCount, 1);
  assert.equal(m.totalPauseSec, 3.2);
  assert.equal(m.totalLatencySec, 1.5);
  assert.equal(m.speakingSec, 5);
  assert.equal(m.durationSec, 7);

  const s = summarizeSpeech(m);
  assert.equal(s.speechRateWpm, 84); // 7 words in 5 s
  assert.equal(s.meanPauseSec, 1.6);
  assert.equal(s.fillersPer100Words, 14.3);
  assert.equal(s.lexicalDiversity, null); // too few words to judge
});

test("returns null when Whisper found no words", () => {
  assert.equal(computeSpeechMarkers([], 3), null);
  assert.equal(computeSpeechMarkers(words(["...", 0, 1]), 3), null);
});

test("combines recordings by adding totals", () => {
  const a = computeSpeechMarkers(words(["Priya", 0.5, 1], ["visited", 1, 1.5]), 2)!;
  const b = computeSpeechMarkers(words(["yesterday", 1.5, 2]), 3)!;
  const c = combineSpeechMarkers([a, null, b, undefined])!;
  assert.equal(c.recordings, 2);
  assert.equal(c.wordCount, 3);
  assert.equal(c.totalLatencySec, 2);
  assert.equal(summarizeSpeech(c).responseLatencySec, 1);
  assert.equal(combineSpeechMarkers([null, undefined]), null);
});

test("finds pauses Whisper hid inside stretched words", () => {
  // Real Whisper output for "I think it is... [2.5 s silence] Saturday. My daughter": no gaps at all.
  const m = computeSpeechMarkers(
    words(["it", 2.98, 3.14], ["is...", 3.14, 4.7], ["Saturday.", 4.7, 7.6], ["My", 7.6, 8.54], ["daughter", 8.54, 8.98]),
    9
  )!;
  assert.equal(m.pauseCount, 2); // after "is..." and after "Saturday."
  assert.equal(m.longPauseCount, 1);
});
