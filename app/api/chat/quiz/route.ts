import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/chat-validation";
import { findPatientForUser, getCollections } from "@/lib/db";
import { runQuizTurn } from "@/lib/gemini";
import { handleQuizTurn } from "@/lib/quiz";
import { checkRateLimit } from "@/lib/rate-limit";
import { QUIZ_MAX_ANSWER_CHARS } from "@/lib/quiz-limits";
import { SPEECH_LIMITS } from "@/lib/speech-markers";

// A single Gemini call can occasionally take longer than Vercel's default
// serverless timeout, especially under provider load — give it more room.
export const maxDuration = 60;

// The client sends only the session ID and its latest answer; the transcript lives on the server
// (see lib/quiz.ts). Any other field, such as a client-built history, is ignored.
const seconds = z.number().finite().min(0).max(SPEECH_LIMITS.maxSeconds);
const count = z.number().int().min(0).max(SPEECH_LIMITS.maxCount);
// Speech markers measured by /api/transcribe for a spoken answer. They are tracking information the
// caregiver's own browser relays; they never affect the score.
const speechSchema = z.object({
  recordings: z.number().int().min(1).max(SPEECH_LIMITS.maxRecordings),
  durationSec: seconds, speakingSec: seconds.min(0.1), wordCount: count, uniqueWordCount: count,
  pauseCount: count, longPauseCount: count, totalPauseSec: seconds, fillerCount: count,
  repetitionCount: count, totalLatencySec: seconds,
});

const schema = z.object({
  sessionId: z.string().min(1).max(100).optional(),
  answer: z.string().max(QUIZ_MAX_ANSWER_CHARS * 2).optional(),
  speech: speechSchema.nullish(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  for (const scope of parsed.data.sessionId ? (["quizTurn"] as const) : (["quizTurn", "quizStart"] as const)) {
    const limit = await checkRateLimit(user.id, scope);
    if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  try {
    const result = await handleQuizTurn({
      collections,
      userId: user.id,
      patient,
      sessionId: parsed.data.sessionId,
      answer: parsed.data.answer,
      speech: parsed.data.speech,
      runTurn: runQuizTurn,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ sessionId: result.sessionId, turn: result.turn, speech: result.speech ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The AI quiz assistant is unavailable right now." }, { status: 502 });
  }
}
