import { test } from "node:test";
import assert from "node:assert/strict";
import { CANDIDATE_K, retrieve, type JsonTask } from "../lib/retrieval";
import type { KnowledgeChunk } from "../lib/types";

// 10 articles; article i has embedding e_i, so the query embedding fixes the dense order.
const chunks: KnowledgeChunk[] = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`, source: `s${i}`, title: `T${i}`, text: `text ${i}`, embedding: Array.from({ length: 10 }, (_, j) => (j === i ? 1 : 0)),
}));
// Dense order: s0 > s1 > ... > s9.
const embed = async () => Array.from({ length: 10 }, (_, j) => 10 - j);
const ask = (text: string) => [{ role: "user" as const, text }];

/** Fake judge: scores by candidate position, as given. */
const judge = (scores: number[], calls: string[] = []): JsonTask => (async (system: string, prompt: string) => {
  calls.push(system.startsWith("You turn") ? "rewrite" : "rerank");
  if (system.startsWith("You turn")) return { query: "standalone rewritten query" };
  return { scores: scores.map((score, i) => ({ id: `A${i + 1}`, score })) };
}) as JsonTask;

test("reranker keeps only articles scoring >= 2, best first, at most 3", async () => {
  const r = await retrieve(ask("q"), chunks, { embed, task: judge([1, 3, 0, 2, 3, 2, 0, 1]) }, { rerank: true, rewrite: false });
  assert.equal(r.mode, "reranked");
  assert.equal(r.candidates.length, CANDIDATE_K);
  assert.deepEqual(r.selected.map((c) => c.source), ["s1", "s4", "s3"]); // two 3s in dense order, then the first 2
});

test("no article is selected when none is relevant (insufficient information)", async () => {
  const r = await retrieve(ask("q"), chunks, { embed, task: judge([1, 1, 0, 0, 1, 0, 0, 0]) }, { rerank: true });
  assert.deepEqual(r.selected, []);
});

test("falls back to dense top 4 if the reranker fails or answers badly", async () => {
  const failing = (async () => { throw new Error("quota"); }) as JsonTask;
  const r = await retrieve(ask("q"), chunks, { embed, task: failing }, { rerank: true });
  assert.equal(r.mode, "dense-fallback");
  assert.deepEqual(r.selected.map((c) => c.source), ["s0", "s1", "s2", "s3"]);
  assert.match(r.errors[0], /rerank failed: quota/);
  const garbage = (async () => ({ scores: [{ id: "A1", score: 3 }] })) as JsonTask;
  assert.equal((await retrieve(ask("q"), chunks, { embed, task: garbage }, { rerank: true })).mode, "dense-fallback");
});

test("rerank off = Phase 2 behaviour (dense top 4)", async () => {
  const r = await retrieve(ask("q"), chunks, { embed, task: judge([]) }, { rerank: false });
  assert.equal(r.mode, "dense");
  assert.equal(r.selected.length, 4);
});

test("query rewriting runs only for follow-ups", async () => {
  const calls: string[] = [];
  const single = await retrieve(ask("q"), chunks, { embed, task: judge([3, 0, 0, 0, 0, 0, 0, 0], calls) }, { rerank: true, rewrite: true });
  assert.equal(single.rewrittenQuery, undefined);
  const followUp = await retrieve(
    [{ role: "user", text: "dad keeps driving" }, { role: "model", text: "..." }, { role: "user", text: "how do I bring it up?" }],
    chunks, { embed, task: judge([3, 0, 0, 0, 0, 0, 0, 0], calls) }, { rerank: true, rewrite: true }
  );
  assert.equal(followUp.rewrittenQuery, "standalone rewritten query");
  assert.equal(followUp.query, "standalone rewritten query");
  assert.deepEqual(calls, ["rerank", "rewrite", "rerank"]);
});
