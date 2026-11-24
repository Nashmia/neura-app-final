import { test } from "node:test";
import assert from "node:assert/strict";
import { caregiverStrain, findThemes, kmeans, labelClusters, moodAnomaly } from "../lib/journal-insights";

const day = (n: number, now = new Date("2026-11-24T12:00:00Z")) => new Date(now.getTime() - n * 86_400_000).toISOString();
const NOW = new Date("2026-11-24T12:00:00Z");

test("k-means separates clearly different groups and is deterministic", () => {
  const vectors = [[1, 0, 0], [0.9, 0.1, 0], [0.95, 0, 0.05], [0, 1, 0], [0.1, 0.9, 0], [0, 0.95, 0.05]];
  const a = kmeans(vectors, 2);
  assert.equal(new Set(a.slice(0, 3)).size, 1);
  assert.equal(new Set(a.slice(3)).size, 1);
  assert.notEqual(a[0], a[3]);
  assert.deepEqual(kmeans(vectors, 2), a);
});

test("clusters are named by their distinctive words", () => {
  const texts = ["Woke at night, poor sleep again", "Restless sleep, up at night", "Bad sleep and night waking", "Refused lunch, ate little", "Lunch was hard, refused food", "Ate little at dinner, refused food"];
  const labels = labelClusters(texts, [0, 0, 0, 1, 1, 1], 2);
  assert.ok(labels[0].includes("sleep"), labels[0].join());
  assert.ok(labels[1].includes("refusing"), labels[1].join());
});

test("themes need enough notes", () => {
  assert.equal(findThemes([{ id: "1", text: "a b c", embedding: [1, 0] }]), null);
  const notes = Array.from({ length: 8 }, (_, i) => ({ id: String(i), text: i < 4 ? "poor sleep at night" : "refused lunch today", embedding: i < 4 ? [1, 0.01 * i] : [0.01 * i, 1] }));
  const themes = findThemes(notes)!;
  assert.equal(themes.reduce((s, t) => s + t.count, 0), 8);
  assert.ok(themes.length >= 2);
});

test("caregiver strain flags consistently heavy recent notes", () => {
  const heavy = [1, 3, 5, 8].map((d) => ({ text: "Terrible day, she was angry and upset and I felt awful and hopeless", createdAt: day(d) }));
  const strain = caregiverStrain(heavy, NOW)!;
  assert.equal(strain.elevated, true);
  assert.ok(strain.recentScore < -0.2);
  const light = [1, 3, 5].map((d) => ({ text: "Lovely calm day, we enjoyed a walk together", createdAt: day(d) }));
  assert.equal(caregiverStrain(light, NOW)!.elevated, false);
  assert.equal(caregiverStrain([], NOW), null);
});

test("mood anomaly compares this week with earlier weeks", () => {
  const earlier = [8, 9, 15, 16, 22, 23].map((d) => ({ moodTag: "Happy" as const, createdAt: day(d) }));
  const low = moodAnomaly([...earlier, { moodTag: "Anxious", createdAt: day(1) }, { moodTag: "Confused", createdAt: day(2) }], NOW)!;
  assert.equal(low.unusual, true);
  assert.equal(low.direction, "lower");
  const usual = moodAnomaly([...earlier, { moodTag: "Happy", createdAt: day(1) }, { moodTag: "Calm", createdAt: day(2) }], NOW)!;
  assert.equal(usual.unusual, false);
  assert.equal(moodAnomaly(earlier, NOW), null); // nothing this week
});

test("each theme's example is its most typical note", () => {
  const notes = [
    { id: "a", text: "slept badly", embedding: [1, 0.3] },
    { id: "b", text: "poor sleep at night", embedding: [1, 0] },
    { id: "c", text: "awake all night", embedding: [1, 0.05] },
    { id: "d", text: "refused lunch", embedding: [0, 1] },
    { id: "e", text: "skipped dinner", embedding: [0.05, 1] },
    { id: "f", text: "would not eat", embedding: [0.1, 1] },
  ];
  const sleep = findThemes(notes)!.find((t) => t.entryIds.includes("b"))!;
  assert.equal(sleep.example, "awake all night"); // nearest the centre, not the first member
});
