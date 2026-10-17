import type { JournalEntry, QuizSession } from "@/lib/types";

/**
 * Structured, intent- and date-aware selection of patient records for the Care Assistant prompt, kept
 * separate from semantic search over the knowledge base. Deterministic (no API calls).
 *
 * By default the prompt carries the 5 newest journal notes and the 3 newest check-ins. When the question
 * names a date ("on the 9th of October", "yesterday"), a recent period ("this week") or asks about
 * progress since the first check-in, the matching older records are added — previously the model simply
 * never saw them (Phase 1 cases p03 and p10).
 */

const DEFAULT_JOURNAL = 5;
const DEFAULT_SESSIONS = 3;
const MAX_JOURNAL = 12;
const MAX_SESSIONS = 10;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";

export type RecordIntent = {
  /** Calendar dates (YYYY-MM-DD) the question refers to. */
  dates: string[];
  /** Include everything from the last N days. */
  recentDays: number | null;
  /** The question compares check-ins over time (first check-in, progress, improvement). */
  quizHistory: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const shift = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** The most recent occurrence of day/month on or before `today` (questions about records look back). */
function resolveDate(day: number, month: number, today: string) {
  if (day < 1 || day > 31) return null;
  const year = Number(today.slice(0, 4));
  for (const y of [year, year - 1]) {
    const ymd = `${y}-${pad(month)}-${pad(day)}`;
    const check = new Date(`${ymd}T00:00:00Z`);
    if (check.getUTCMonth() + 1 !== month) return null; // e.g. 31 Feb
    if (ymd <= today) return ymd;
  }
  return null;
}

/** Reads dates, periods and progress questions from the caregiver's message. `today` is YYYY-MM-DD. */
export function detectRecordIntent(text: string, today: string): RecordIntent {
  const t = text.toLowerCase();
  const dates = new Set<string>();
  for (const m of t.matchAll(new RegExp(`\\b${DAY}\\s+(?:of\\s+)?${MONTH}\\b`, "g"))) {
    const d = resolveDate(Number(m[1]), MONTHS[m[2].slice(0, 3)], today);
    if (d) dates.add(d);
  }
  for (const m of t.matchAll(new RegExp(`\\b${MONTH}\\s+${DAY}\\b`, "g"))) {
    const d = resolveDate(Number(m[2]), MONTHS[m[1].slice(0, 3)], today);
    if (d) dates.add(d);
  }
  if (/\byesterday\b/.test(t)) dates.add(shift(today, -1));
  if (/\btoday\b/.test(t)) dates.add(today);

  const recentDays = /\b(this|last|past) (week|7 days)\b|\blast few days\b|\bpast few days\b/.test(t) ? 7 : null;
  const quizHistory =
    /\b(check-?ins?|quiz(zes)?|scores?|tests?|cognitive)\b/.test(t) &&
    /\b(first|earliest|start(ed)?|began|beginning|improv\w*|progress\w*|over time|trend\w*|compar\w*|declin\w*|better|worse|changed?)\b/.test(t);

  return { dates: [...dates], recentDays, quizHistory };
}

/**
 * Journal notes for the prompt, newest first: the 5 newest, plus any on the dates asked about or within
 * the period asked about (at most 12). `localDate` converts a timestamp to YYYY-MM-DD in the app time zone.
 */
export function selectJournal(entries: JournalEntry[], intent: RecordIntent, today: string, localDate: (iso: string) => string) {
  const newest = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const since = intent.recentDays ? shift(today, -intent.recentDays) : null;
  const wanted = (e: JournalEntry) => {
    const day = localDate(e.createdAt);
    return intent.dates.includes(day) || (since !== null && day >= since);
  };
  const picked = newest.filter((e, i) => i < DEFAULT_JOURNAL || wanted(e));
  return picked.slice(0, MAX_JOURNAL);
}

/** Check-ins for the prompt, newest first: the 3 newest, or up to 10 plus the very first one for progress questions. */
export function selectSessions(sessions: QuizSession[], intent: RecordIntent) {
  const newest = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!intent.quizHistory) return { sessions: newest.slice(0, DEFAULT_SESSIONS), firstId: newest.length <= DEFAULT_SESSIONS ? newest.at(-1)?.id : undefined };
  const picked = newest.slice(0, MAX_SESSIONS);
  const first = newest.at(-1);
  if (first && !picked.includes(first)) picked[picked.length - 1] = first;
  return { sessions: picked, firstId: first?.id };
}
