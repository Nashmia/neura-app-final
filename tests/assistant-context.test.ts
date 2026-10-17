import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildKnowledgeContext,
  buildPatientContext,
  citedSources,
  formatTimestamp,
  parseCitations,
  todayIn,
  upcomingAppointments,
} from "../lib/assistant-context";
import type { Appointment, KnowledgeChunk } from "../lib/types";

const chunk = (source: string): KnowledgeChunk => ({ id: source, source, title: `Title ${source}`, text: `Text ${source}`, embedding: [] });
const chunks = ["a", "b", "c", "d"].map(chunk);

test("only cited sources are returned, in citation order; uncited and out-of-range ones are dropped", () => {
  const reply = "Stay calm [3]. Use a whiteboard [1][3]. See also [7] and [0].";
  assert.deepEqual(citedSources(reply, chunks), [
    { n: 3, title: "Title c", source: "c" },
    { n: 1, title: "Title a", source: "a" },
  ]);
  assert.deepEqual(citedSources("No citations here.", chunks), []);
});

test("citation formats: lists and ranges", () => {
  assert.deepEqual(parseCitations("x [2, 4] y [1-2]", 4), [2, 4, 1]);
  assert.deepEqual(parseCitations("x [1–3]", 4), [1, 2, 3]);
  assert.deepEqual(parseCitations("x [1-99]", 4), [1, 2, 3, 4]);
});

test("excerpts are numbered [1]..[n]", () => {
  assert.match(buildKnowledgeContext(chunks), /^\[1\] Title a\nText a\n\n\[2\] Title b/);
});

const appt = (id: string, date: string, status: Appointment["status"] = "Upcoming") =>
  ({ id, title: id, date, time: "10:00", status }) as Appointment;

test("past appointments still marked Upcoming are excluded; today and future are kept", () => {
  const list = [appt("past", "2026-10-01"), appt("today", "2026-10-17"), appt("future", "2026-11-03"), appt("cancelled", "2026-11-04", "Cancelled")];
  assert.deepEqual(upcomingAppointments(list, "2026-10-17").map((a) => a.id), ["today", "future"]);
});

test("dates are written unambiguously in the app time zone, regardless of server locale", () => {
  assert.equal(formatTimestamp("2026-10-11T10:00:00.000Z", "Asia/Karachi"), "11 Oct 2026");
  assert.equal(formatTimestamp("2026-10-14T19:00:00.000Z", "Asia/Karachi"), "15 Oct 2026"); // after midnight in Pakistan
  assert.equal(todayIn(new Date("2026-10-16T20:00:00Z"), "Asia/Karachi"), "2026-10-17");
});

test("patient context uses the date filter and word dates", () => {
  const text = buildPatientContext(
    {
      patient: { name: "P", age: 80, dementiaStage: "Mild" },
      medications: [],
      sessions: [{ id: "s", userId: "u", patientId: "p", score: 2, total: 5, createdAt: "2026-10-11T10:00:00.000Z" }],
      journalEntries: [],
      appointments: [appt("Old physio", "2026-10-01"), appt("Neurologist", "2026-11-03")],
    },
    new Date("2026-10-17T09:00:00Z")
  );
  assert.match(text, /2\/5 on 11 Oct 2026/);
  assert.match(text, /Neurologist on 3 Nov 2026 at 10:00/);
  assert.doesNotMatch(text, /Old physio/);
  assert.doesNotMatch(text, /\d{1,2}\/\d{1,2}\/\d{2,4}/);
});

test("the today line names the weekday so the model never has to guess it", () => {
  const text = buildPatientContext({ patient: { name: "P", age: 80, dementiaStage: "Mild" }, medications: [], sessions: [], journalEntries: [], appointments: [] }, new Date("2026-10-17T09:00:00Z"));
  assert.match(text, /^Today is Saturday, 17 Oct 2026\./);
});
