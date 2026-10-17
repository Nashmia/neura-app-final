import { after, test } from "node:test";
import assert from "node:assert/strict";
import { useTempJsonDb } from "./helpers";
import { checkRateLimit, RATE_LIMITS } from "../lib/rate-limit";

after(useTempJsonDb());

// Test clock: 01:00 UTC tomorrow (start of a 10-minute window, in the future so the store never prunes these counters early).
const T0 = (Math.floor(Date.now() / 86_400_000) + 1) * 86_400_000 + 3_600_000;

test("assistant: 6 requests per 10 minutes, the 7th gets a friendly refusal", async () => {
  for (let i = 0; i < 6; i++) assert.ok((await checkRateLimit("alice", "assistant", T0 + i)).ok, `request ${i + 1}`);
  const refused = await checkRateLimit("alice", "assistant", T0 + 10);
  assert.ok(!refused.ok);
  assert.match(refused.message, /wait about 10 minutes/);
  assert.equal(refused.retryAfterSeconds, 600);
});

test("limits are per user", async () => {
  assert.ok((await checkRateLimit("bob", "assistant", T0)).ok);
});

test("the burst window resets, but the daily limit still applies", async () => {
  let allowed = 0;
  // 7 ten-minute windows x 6 requests = 42 attempts; only 30 fit in the day.
  for (let w = 1; w <= 7; w++) for (let i = 0; i < 6; i++) if ((await checkRateLimit("carol", "assistant", T0 + w * 600_000 + i)).ok) allowed++;
  assert.equal(allowed, RATE_LIMITS.assistant[1].max);
  const refused = await checkRateLimit("carol", "assistant", T0 + 8 * 600_000);
  assert.ok(!refused.ok);
  assert.match(refused.message, /today's limit/);
});

test("quiz: 3 check-in starts per day", async () => {
  for (let i = 0; i < 3; i++) assert.ok((await checkRateLimit("dave", "quizStart", T0 + i)).ok);
  assert.ok(!(await checkRateLimit("dave", "quizStart", T0 + 5)).ok);
});
