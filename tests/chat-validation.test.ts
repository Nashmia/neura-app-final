import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TURNS, MAX_USER_TURN_CHARS, readJsonBody, validateHistory } from "../lib/chat-validation";

const u = (text = "hi") => ({ role: "user", text });
const m = (text = "hello") => ({ role: "model", text });

test("accepts a normal alternating conversation", () => {
  const r = validateHistory([u(), m(), u("and then?")]);
  assert.ok(r.ok);
  assert.equal(r.history.length, 3);
});

test("rejects an oversized user turn with 413", () => {
  const r = validateHistory([u("x".repeat(MAX_USER_TURN_CHARS + 1))]);
  assert.ok(!r.ok);
  assert.equal(r.status, 413);
});

test("rejects bad role order, a trailing model turn, empty text, and junk", () => {
  for (const bad of [[m(), u()], [u(), u()], [u(), m()], [u("   ")], [], "nope", [{ role: "system", text: "x" }], [{ role: "user" }]]) {
    const r = validateHistory(bad);
    assert.ok(!r.ok, JSON.stringify(bad));
    assert.equal(r.status, 400);
  }
});

test("trims long conversations to the newest turns, still starting with the user", () => {
  const long = Array.from({ length: 31 }, (_, i) => (i % 2 ? m(`a${i}`) : u(`q${i}`)));
  const r = validateHistory(long);
  assert.ok(r.ok);
  assert.ok(r.truncated);
  assert.ok(r.history.length <= MAX_TURNS);
  assert.equal(r.history[0].role, "user");
  assert.equal(r.history.at(-1)!.text, "q30");
});

test("refuses bodies over the byte limit before parsing", async () => {
  const big = new Request("http://x", { method: "POST", body: JSON.stringify({ history: [u("y".repeat(100_000))] }) });
  const r = await readJsonBody(big);
  assert.ok(!r.ok);
  assert.equal(r.status, 413);
  const bad = await readJsonBody(new Request("http://x", { method: "POST", body: "{not json" }));
  assert.ok(!bad.ok);
  assert.equal(bad.status, 400);
});
