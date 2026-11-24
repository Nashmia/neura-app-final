import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestMood } from "../lib/mood-suggest";

test("keyword rules pick the specific negative moods", () => {
  assert.equal(suggestMood("Mum was confused about where she was this morning")?.tag, "Confused");
  assert.equal(suggestMood("Very restless and worried in the evening")?.tag, "Anxious");
  assert.equal(suggestMood("Slept most of the afternoon, quite drowsy")?.tag, "Tired");
  assert.equal(suggestMood("He didn't recognise his brother at lunch")?.tag, "Confused");
});

test("sentiment decides between Happy and Calm when no keyword matches", () => {
  assert.equal(suggestMood("Lovely day, laughed with the grandkids")?.tag, "Happy");
  assert.equal(suggestMood("Ate lunch fine and watched some TV")?.tag, "Calm");
  assert.equal(suggestMood("Ate lunch and watched the news"), null); // neutral: no guess
});

test("negated keywords are ignored", () => {
  const s = suggestMood("She was not confused today, had a lovely walk");
  assert.equal(s?.tag, "Happy");
  assert.equal(suggestMood("No agitation at all this evening, a good night")?.tag === "Anxious", false);
});

test("too-short notes get no suggestion", () => {
  assert.equal(suggestMood(""), null);
  assert.equal(suggestMood("tired"), null);
});

test("the emotion model decides when no keyword matches", () => {
  assert.equal(suggestMood("She kept calling for her mother all evening", { label: "fear", score: 0.82 })?.tag, "Anxious");
  assert.equal(suggestMood("We looked at old photos together", { label: "joy", score: 0.62 })?.tag, "Happy");
  // Keywords still win, and a weak emotion falls back to VADER.
  assert.equal(suggestMood("Very tired after the walk", { label: "joy", score: 0.9 })?.tag, "Tired");
  assert.equal(suggestMood("Ate lunch fine and watched some TV", { label: "fear", score: 0.3 })?.tag, "Calm");
});
