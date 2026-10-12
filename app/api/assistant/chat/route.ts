import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { cosineSimilarity, embedText } from "@/lib/embeddings";
import { runAssistantTurn, type HistoryTurn } from "@/lib/gemini";
import { runFinetunedTurn } from "@/lib/finetuned-model";

// This route does an embedding call, several DB reads, and a generation call
// in sequence — comfortably over Vercel's default serverless timeout when
// Gemini is slow to respond, so give it more headroom.
export const maxDuration = 60;

/**
 * Which model actually generates the assistant's reply. Defaults to Gemini.
 * Set ASSISTANT_MODEL_PROVIDER=finetuned to use the fine-tuned model hosted
 * on Hugging Face (see training/) instead — if that endpoint is unreachable
 * (e.g. a free HF Space asleep), this falls back to Gemini automatically so
 * the assistant stays usable.
 */
async function generateReply(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  if (process.env.ASSISTANT_MODEL_PROVIDER === "finetuned") {
    try {
      return await runFinetunedTurn(systemInstruction, history);
    } catch (error) {
      console.error("Fine-tuned model unavailable, falling back to Gemini:", error);
    }
  }
  return runAssistantTurn(systemInstruction, history);
}

const schema = z.object({
  history: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string() })).min(1),
});

const TOP_K = 4;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { history } = parsed.data;
  const lastTurn = history[history.length - 1];
  if (lastTurn.role !== "user") return NextResponse.json({ error: "The last message must be from the caregiver." }, { status: 400 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  try {
    const [chunks, medications, sessions, journalEntries, appointments] = await Promise.all([
      collections.knowledgeChunks.find({}, withoutMongoId).toArray(),
      collections.medications.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.appointments.find({ patientId: patient.id }, withoutMongoId).toArray(),
    ]);

    // Embed the last couple of turns, not just the latest message, so
    // pronoun-heavy follow-ups ("what should I write on it?") still retrieve
    // the article the conversation is actually about.
    const retrievalQuery = history
      .slice(-4)
      .map((turn) => turn.text)
      .join("\n");
    const queryEmbedding = await embedText(retrievalQuery);
    const topChunks = [...chunks]
      .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K)
      .map((r) => r.chunk);

    const knowledgeContext = topChunks.length
      ? topChunks.map((c) => `### ${c.title}\n${c.text}`).join("\n\n")
      : "(No knowledge base articles matched this question.)";

    const recentSessions = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
    const recentJournal = [...journalEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    const upcomingAppointments = appointments
      .filter((a) => a.status === "Upcoming")
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .slice(0, 3);

    const patientContext = [
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

    const systemInstruction = `You are Neura's Care Assistant, a supportive AI for caregivers of dementia patients. Answer the caregiver's question grounded in the two sources of information below. Be warm, concise, and practical.

Rules:
- Base your answer on the knowledge base excerpts and the patient's recent care data provided below.
- If the knowledge base doesn't cover the question, say so honestly rather than inventing advice.
- Never provide a medical diagnosis or tell them to change a medication dose — for medical decisions, recommend contacting the patient's doctor.
- Keep answers focused and readable (a few short paragraphs or a short list), not an essay.

## Knowledge base excerpts
${knowledgeContext}

## This patient's recent care data
${patientContext}`;

    const message = await generateReply(systemInstruction, history as HistoryTurn[]);

    return NextResponse.json({
      message,
      sources: topChunks.map((c) => ({ title: c.title, source: c.source })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The care assistant is unavailable right now." }, { status: 502 });
  }
}
