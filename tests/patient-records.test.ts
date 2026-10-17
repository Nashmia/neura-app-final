import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRecordIntent, selectJournal, selectSessions } from "../lib/patient-records";
import { buildPatientContext } from "../lib/assistant-context";
import type { JournalEntry, QuizSession } from "../lib/types";

const TODAY = "2026-10-17";

test("reads dates, periods and progress questions", () => {
  assert.deepEqual(detectRecordIntent("She refused her bath on the 9th of October. Before that too?", TODAY).dates, ["2026-10-09"]);
  assert.deepEqual(detectRecordIntent("what happened on oct 3rd and 5 october", TODAY).dates.sort(), ["2026-10-03", "2026-10-05"]);
  assert.deepEqual(detectRecordIntent("how was she yesterday", TODAY).dates, ["2026-10-16"]);
  assert.deepEqual(detectRecordIntent("anything on 20 December?", TODAY).dates, ["2025-12-20"]); // looks back, not ahead
  assert.equal(detectRecordIntent("How has she been this week?", TODAY).recentDays, 7);
  assert.equal(detectRecordIntent("Has her check-in score improved since her very first check-in?", TODAY).quizHistory, true);
  assert.equal(detectRecordIntent("What was her most recent check-in score?", TODAY).quizHistory, false);
  assert.equal(detectRecordIntent("Is she getting better at eating?", TODAY).quizHistory, false); // no check-in words
});

const entry = (day: number): JournalEntry => ({ id: `j${day}`, userId: "u", patientId: "p", text: `note ${day}`, createdAt: `2026-10-${String(day).padStart(2, "0")}T09:00:00.000Z` });
const journal = [14, 13, 12, 11, 10, 9, 8, 1].map(entry);
const local = (iso: string) => iso.slice(0, 10);

test("journal: 5 newest by default, plus entries on dates asked about", () => {
  assert.deepEqual(selectJournal(journal, detectRecordIntent("how is she", TODAY), TODAY, local).map((e) => e.id), ["j14", "j13", "j12", "j11", "j10"]);
  assert.deepEqual(selectJournal(journal, detectRecordIntent("what about 9 October and 1st Oct?", TODAY), TODAY, local).map((e) => e.id), ["j14", "j13", "j12", "j11", "j10", "j9", "j1"]);
  assert.deepEqual(selectJournal(journal, detectRecordIntent("how was this week", TODAY), TODAY, local).map((e) => e.id), ["j14", "j13", "j12", "j11", "j10"]);
});

const session = (id: string, day: string, score: number): QuizSession => ({ id, userId: "u", patientId: "p", score, total: 5, createdAt: `2026-${day}T10:00:00.000Z` });
const sessions = [session("s1", "09-20", 1), session("s2", "09-27", 3), session("s3", "10-04", 4), session("s4", "10-11", 2)];

test("check-ins: 3 newest by default; progress questions include the first check-in", () => {
  assert.deepEqual(selectSessions(sessions, detectRecordIntent("latest score?", TODAY)).sessions.map((s) => s.id), ["s4", "s3", "s2"]);
  const history = selectSessions(sessions, detectRecordIntent("has her score improved since the first check-in?", TODAY));
  assert.deepEqual(history.sessions.map((s) => s.id), ["s4", "s3", "s2", "s1"]);
  assert.equal(history.firstId, "s1");
});

test("patient context carries the older records only when asked", () => {
  const data = { patient: { name: "P", age: 80, dementiaStage: "Mild" }, medications: [], sessions, journalEntries: journal, appointments: [] };
  const now = new Date("2026-10-17T09:00:00Z");
  assert.doesNotMatch(buildPatientContext(data, now, "How is she?"), /1\/5|note 9/);
  assert.match(buildPatientContext(data, now, "Has her check-in score improved since her very first check-in?"), /1\/5 on 20 Sept? 2026 \(first check-in\)/);
  assert.match(buildPatientContext(data, now, "She refused her bath on the 9th of October. Before that too?"), /note 9/);
});
