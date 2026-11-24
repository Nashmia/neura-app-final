import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPassages, candidatePassages, factCheck, splitReply } from "../lib/ml/fact-check";
import type { NliPair } from "../lib/ml/protocol";

test("splits a reply into sentences, keeping citations and whitespace", () => {
  const reply = "Keep a steady routine in the evening [1]. Dim the lights.\n- Offer a calm activity like music.\nWhy not try it?";
  const segments = splitReply(reply);
  assert.equal(segments.map((s) => s.text).join(""), reply);
  assert.deepEqual(segments.map((s) => s.text.trim()), ["Keep a steady routine in the evening [1].", "Dim the lights.", "- Offer a calm activity like music.", "Why not try it?"]);
  assert.deepEqual(segments.map((s) => s.check), [true, false, true, false]); // short and question segments are skipped
  assert.equal(splitReply("Take 2.5 mg daily with water please.").length, 1); // decimal points don't split
});

test("picks overlapping passages and classifies each sentence", async () => {
  const evidence = ["Sundowning is confusion in the evening. A steady evening routine can help reduce sundowning. Bright light in the day may help."];
  const passages = buildPassages(evidence);
  assert.ok(candidatePassages("A steady evening routine helps with sundowning", passages).length > 0);
  assert.equal(candidatePassages("Antibiotics treat infections quickly", passages).length, 0);

  // Fake NLI: entails when the premise mentions "routine", contradicts when the claim says "never".
  // Contradiction is deliberately not reported (see lib/ml/fact-check.ts), so that sentence is just unverified.
  const nli = async (pairs: NliPair[]) =>
    pairs.map((p) => ({ entailment: p.hypothesis.includes("never") ? 0 : p.premise.includes("routine") ? 0.9 : 0.1, contradiction: p.hypothesis.includes("never") ? 0.9 : 0, neutral: 0.1 }));
  const reply = "A steady evening routine can help with sundowning [1]. You should never keep an evening routine for sundowning. Antibiotics treat infections quickly and safely.";
  const { checks } = await factCheck(reply, evidence, nli);
  assert.deepEqual(checks.map((c) => c.verdict), ["supported", "unverified", "unverified"]);
});

test("bold headings are not checked as statements", () => {
  const segments = splitReply("**What you can try tonight**\nKeep the same bedtime every single night.");
  assert.deepEqual(segments.map((s) => s.check), [false, true]);
});
