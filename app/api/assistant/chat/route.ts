import { NextResponse } from "next/server";
import { buildKnowledgeContext, buildPatientContext, buildSystemInstruction, citedSources } from "@/lib/assistant-context";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody, validateHistory } from "@/lib/chat-validation";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { runAssistantTurn, runJsonTask, type HistoryTurn } from "@/lib/gemini";
import { runFinetunedTurn } from "@/lib/finetuned-model";
import { groqModel, runGroqTurn } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limit";
import { retrieve } from "@/lib/retrieval";

// This route does an embedding call, several DB reads, and a generation call
// in sequence — comfortably over Vercel's default serverless timeout when
// Gemini is slow to respond, so give it more headroom.
export const maxDuration = 60;

/**
 * Which model generates the assistant's reply, chosen by ASSISTANT_MODEL_PROVIDER:
 *   (unset)    Gemini (default)
 *   groq       Meta Llama on Groq (needs GROQ_API_KEY); sub-second generation
 *   finetuned  the self-trained Llama-3.2-1B on the Hugging Face Space (see training/)
 * Any failure of Groq or the Space falls back to Gemini so the assistant stays usable.
 * Returns which model answered and how long generation took, for display.
 */
async function generateReply(systemInstruction: string, history: HistoryTurn[]): Promise<{ message: string; model: string; ms: number }> {
  const provider = process.env.ASSISTANT_MODEL_PROVIDER;
  const started = Date.now();
  if (provider === "groq") {
    try {
      const message = await runGroqTurn(systemInstruction, history);
      return { message, model: `Llama (${groqModel()}) via Groq`, ms: Date.now() - started };
    } catch (error) {
      console.error("Groq unavailable, falling back to Gemini:", error);
    }
  }
  if (provider === "finetuned") {
    try {
      const message = await runFinetunedTurn(systemInstruction, history);
      return { message, model: "Neura fine-tuned Llama-3.2-1B", ms: Date.now() - started };
    } catch (error) {
      console.error("Fine-tuned model unavailable, falling back to Gemini:", error);
    }
  }
  const fallbackStart = Date.now();
  const message = await runAssistantTurn(systemInstruction, history);
  return { message, model: "Gemini", ms: Date.now() - fallbackStart };
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

    // Dense candidates, then an LLM relevance check; falls back to plain top-4 retrieval on any failure.
    const retrieval = await retrieve(history, chunks, { embed: embedText, task: runJsonTask });
    if (retrieval.errors.length) console.warn("Retrieval degraded:", retrieval.errors.join("; "));
    const topChunks = retrieval.selected;

    const systemInstruction = buildSystemInstruction(
      buildKnowledgeContext(topChunks),
      buildPatientContext({ patient, medications, sessions, journalEntries, appointments }, new Date(), history[history.length - 1].text)
    );
    const { message, model, ms } = await generateReply(systemInstruction, history);

    // Show only the excerpts the reply actually cites; uncited (often irrelevant) articles are dropped.
    return NextResponse.json({ message, sources: citedSources(message, topChunks), model, generationMs: ms });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The care assistant is unavailable right now." }, { status: 502 });
  }
}
