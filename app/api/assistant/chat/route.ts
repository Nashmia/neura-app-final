import { NextResponse } from "next/server";
import {
  buildKnowledgeContext,
  buildPatientContext,
  buildRetrievalQuery,
  buildSystemInstruction,
  citedSources,
  rankChunks,
  TOP_K,
} from "@/lib/assistant-context";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody, validateHistory } from "@/lib/chat-validation";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { runAssistantTurn, type HistoryTurn } from "@/lib/gemini";
import { runFinetunedTurn } from "@/lib/finetuned-model";
import { checkRateLimit } from "@/lib/rate-limit";

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const checked = validateHistory((body.data as { history?: unknown } | null)?.history);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { history } = checked;

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const limit = await checkRateLimit(user.id, "assistant");
  if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  try {
    const [chunks, medications, sessions, journalEntries, appointments] = await Promise.all([
      collections.knowledgeChunks.find({}, withoutMongoId).toArray(),
      collections.medications.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.appointments.find({ patientId: patient.id }, withoutMongoId).toArray(),
    ]);

    const queryEmbedding = await embedText(buildRetrievalQuery(history));
    const topChunks = rankChunks(queryEmbedding, chunks)
      .slice(0, TOP_K)
      .map((r) => r.chunk);

    const systemInstruction = buildSystemInstruction(
      buildKnowledgeContext(topChunks),
      buildPatientContext({ patient, medications, sessions, journalEntries, appointments }, new Date())
    );
    const message = await generateReply(systemInstruction, history);

    // Show only the excerpts the reply actually cites; uncited (often irrelevant) articles are dropped.
    return NextResponse.json({ message, sources: citedSources(message, topChunks) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The care assistant is unavailable right now." }, { status: 502 });
  }
}
