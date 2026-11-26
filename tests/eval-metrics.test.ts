import { test } from "node:test";
import assert from "node:assert/strict";
import { binaryCounts, bm25Rank, confusion, f1, perClass, precision, recall, recallAtK, reciprocalRank } from "../evaluation/ml/metrics";

test("binary precision, recall and F1", () => {
  const c = binaryCounts([true, true, false, false, true], [true, false, true, false, true]);
  assert.deepEqual(c, { tp: 2, fp: 1, fn: 1, tn: 1 });
  assert.equal(precision(c), 2 / 3);
  assert.equal(recall(c), 2 / 3);
  assert.equal(f1(c), 2 / 3);
});

test("confusion matrix and macro F1", () => {
  const labels = ["a", "b"];
  assert.deepEqual(confusion(labels, ["a", "a", "b"], ["a", "b", "b"]), [[1, 1], [0, 1]]);
  const r = perClass(labels, ["a", "a", "b"], ["a", "b", "b"]);
  assert.equal(r.accuracy, 2 / 3);
  assert.equal(r.rows[0].precision, 1);
  assert.equal(r.rows[1].recall, 1);
});

test("BM25 ranks keyword matches first", () => {
  const ranked = bm25Rank("bath resistance", ["went for a walk", "refused the bath again", "bath time resistance was strong"]);
  assert.equal(ranked[0].index, 2);
  assert.equal(ranked[2].score, 0);
});

test("ranking metrics", () => {
  assert.equal(recallAtK(["x", "a", "y", "b"], ["a", "b"], 3), 0.5);
  assert.equal(reciprocalRank(["x", "a"], ["a"]), 0.5);
  assert.equal(reciprocalRank(["x"], ["a"]), 0);
});
