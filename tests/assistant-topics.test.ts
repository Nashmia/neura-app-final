import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTopic, getTopicVectors, TOPICS } from "../lib/assistant-topics";

test("tags a question with the most similar topic", async () => {
  // One-hot topic vectors: the question vector points at "sleep".
  const vectors = await getTopicVectors(async (text) => TOPICS.map((t) => (text.startsWith(t.label) ? 1 : 0)));
  const sleep = TOPICS.findIndex((t) => t.id === "sleep");
  const question = TOPICS.map((_, i) => (i === sleep ? 0.9 : 0.1));
  assert.equal(classifyTopic(question, vectors), "sleep");
});
