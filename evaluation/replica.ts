/**
 * Replica of the Care Assistant's retrieval + context construction.
 *
 * The production logic lives inline in app/api/assistant/chat/route.ts (POST handler), so it can't be
 * imported. Each function below copies the cited lines as of commit f32ddad, changing only where the
 * data comes from (function arguments instead of MongoDB queries). drift-check.ts compares those route
 * lines against route-snapshot.txt on every run and flags any difference.
 *
 * Shared helpers ARE imported from production unchanged: embedText / cosineSimilarity (lib/embeddings.ts)
 * and runAssistantTurn (lib/gemini.ts) — see run.ts.
 */

export type Turn = { role: "user" | "model"; text: string };
export type Chunk = { id: string; source: string; title: string; text: string; embedding: number[] };
export type Patient = { id: string; name: string; age: number; dementiaStage: string };
export type Medication = { name: string; dosage: string; time: string; status: string };
export type QuizSession = { score: number; total: number; createdAt: string };
export type JournalEntry = { text: string; moodTag?: string; createdAt: string };
export type Appointment = { title: string; date: string; time: string; status: string };

/** route.ts:36 */
export const TOP_K = 4;

/** route.ts:65-68 — the last 4 turns joined with newlines. */
export function buildRetrievalQuery(history: Turn[]): string {
  return history
    .slice(-4)
    .map((turn) => turn.text)
    .join("\n");
}

/**
 * route.ts:70-74 — score every chunk by cosine similarity and sort descending.
 * Returns the FULL ranking (not just the top K) so the evaluation can report the expected article's rank
 * even when it falls outside the top K. `topK(ranking)` gives exactly what the route keeps.
 */
export function rankChunks(
  queryEmbedding: number[],
  chunks: Chunk[],
  cosineSimilarity: (a: number[], b: number[]) => number
): { chunk: Chunk; score: number }[] {
  return [...chunks]
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score);
}

export function topK<T>(ranking: T[]): T[] {
  return ranking.slice(0, TOP_K);
}

/** route.ts:76-78 */
export function buildKnowledgeContext(topChunks: Chunk[]): string {
  return topChunks.length
    ? topChunks.map((c) => `### ${c.title}\n${c.text}`).join("\n\n")
    : "(No knowledge base articles matched this question.)";
}

/** route.ts:80-103 */
export function buildPatientContext(data: {
  patient: Patient;
  medications: Medication[];
  quizSessions: QuizSession[];
  journalEntries: JournalEntry[];
  appointments: Appointment[];
}): string {
  const { patient, medications, quizSessions: sessions, journalEntries, appointments } = data;
  const recentSessions = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const recentJournal = [...journalEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const upcomingAppointments = appointments
    .filter((a) => a.status === "Upcoming")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 3);

  return [
    `Patient: ${patient.name}, age ${patient.age}, ${patient.dementiaStage} stage dementia.`,
    medications.length
      ? `Current medications: ${medications.map((m) => `${m.name} (${m.dosage}, ${m.time}, ${m.status})`).join("; ")}.`
      : "No medications recorded.",
    recentSessions.length
      ? `Recent cognitive check-ins: ${recentSessions.map((s) => `${s.score}/${s.total} on ${new Date(s.createdAt).toLocaleDateString()}`).join("; ")}.`
      : "No cognitive check-ins recorded yet.",
    recentJournal.length
      ? `Recent caregiver journal notes: ${recentJournal
          .map((j) => `[${new Date(j.createdAt).toLocaleDateString()}${j.moodTag ? `, mood: ${j.moodTag}` : ""}] ${j.text || "(mood check-in only)"}`)
          .join(" | ")}.`
      : "No journal notes recorded yet.",
    upcomingAppointments.length
      ? `Upcoming appointments: ${upcomingAppointments.map((a) => `${a.title} on ${a.date} at ${a.time}`).join("; ")}.`
      : "No upcoming appointments scheduled.",
  ].join("\n");
}

/** route.ts:105-117 */
export function buildSystemInstruction(knowledgeContext: string, patientContext: string): string {
  return `You are Neura's Care Assistant, a supportive AI for caregivers of dementia patients. Answer the caregiver's question grounded in the two sources of information below. Be warm, concise, and practical.

Rules:
- Base your answer on the knowledge base excerpts and the patient's recent care data provided below.
- If the knowledge base doesn't cover the question, say so honestly rather than inventing advice.
- Never provide a medical diagnosis or tell them to change a medication dose — for medical decisions, recommend contacting the patient's doctor.
- Keep answers focused and readable (a few short paragraphs or a short list), not an essay.

## Knowledge base excerpts
${knowledgeContext}

## This patient's recent care data
${patientContext}`;
}
