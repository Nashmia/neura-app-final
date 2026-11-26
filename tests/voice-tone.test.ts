import { test } from "node:test";
import assert from "node:assert/strict";
import { combineVoiceTone, summarizeVoiceTone, toneFromScores } from "../lib/voice-tone";

test("weights each recording's tone by its length and adds recordings up", () => {
  const happy = toneFromScores({ neu: 0.2, hap: 0.8, ang: 0, sad: 0 }, 6);
  assert.deepEqual(happy, { recordings: 1, seconds: 6, neu: 1.2, hap: 4.8, ang: 0, sad: 0 });
  const sad = toneFromScores({ neu: 0.5, hap: 0, ang: 0, sad: 0.5 }, 2);
  const both = combineVoiceTone([happy, null, sad])!;
  assert.equal(both.recordings, 2);
  assert.equal(both.seconds, 8);
  const summary = summarizeVoiceTone(both)!;
  assert.equal(summary.dominant, "hap");
  assert.equal(summary.shares.hap, 0.6); // 4.8 of 8 seconds
  assert.equal(summary.shares.sad, 0.13);
});

test("too little speech is not summarised", () => {
  assert.equal(summarizeVoiceTone(toneFromScores({ neu: 1 }, 1.5)), null);
  assert.equal(combineVoiceTone([null, undefined]), null);
});
