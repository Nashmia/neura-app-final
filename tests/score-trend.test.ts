import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreTrend } from "../lib/score-trend";

test("needs at least five check-ins", () => {
  assert.equal(scoreTrend([80, 70, 60, 50]), null);
});

test("fits a least-squares line and classifies the change", () => {
  const down = scoreTrend([90, 85, 80, 75, 70])!;
  assert.equal(down.slope, -5);
  assert.equal(down.change, -20);
  assert.equal(down.status, "declining");
  assert.deepEqual(down.fitted, [90, 85, 80, 75, 70]);

  assert.equal(scoreTrend([60, 70, 65, 80, 85])!.status, "improving");
  assert.equal(scoreTrend([80, 75, 80, 85, 80])!.status, "stable");
});

test("flags a latest score that is unusually low for this patient", () => {
  const dip = scoreTrend([80, 85, 80, 85, 60])!;
  assert.equal(dip.latestUnusuallyLow, true);
  // Identical earlier scores: the SD floor keeps a small dip from counting as unusual.
  assert.equal(scoreTrend([80, 80, 80, 80, 75])!.latestUnusuallyLow, false);
});
