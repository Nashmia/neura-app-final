import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/chat-validation";
import { findPatientForUser, getCollections } from "@/lib/db";
import { describePhoto, runQuizTurn, type HistoryTurn, type QuizTurn } from "@/lib/gemini";
import { runGroqJsonTurn } from "@/lib/groq";
import { handleQuizTurn } from "@/lib/quiz";
import { checkRateLimit } from "@/lib/rate-limit";
import { QUIZ_MAX_ANSWER_CHARS } from "@/lib/quiz-limits";
import { SPEECH_LIMITS } from "@/lib/speech-markers";
import { VOICE_TONE_LIMITS } from "@/lib/voice-tone";

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

// How the spoken answer sounded (on-device speech-emotion model, lib/voice-tone.ts): seconds of speech
// per tone. Like the speech markers, tracking information only; it never affects the score.
const toneSeconds = z.number().finite().min(0).max(VOICE_TONE_LIMITS.maxSeconds);
const voiceToneSchema = z.object({
  recordings: z.number().int().min(1).max(VOICE_TONE_LIMITS.maxRecordings),
  seconds: toneSeconds, neu: toneSeconds, hap: toneSeconds, ang: toneSeconds, sad: toneSeconds,
});

const schema = z.object({
  sessionId: z.string().min(1).max(100).optional(),
  answer: z.string().max(QUIZ_MAX_ANSWER_CHARS * 2).optional(),
  speech: speechSchema.nullish(),
  voiceTone: voiceToneSchema.nullish(),
});

/**
 * Gemini runs the check-in. If every Gemini model is overloaded, Groq's open-weight model takes the
 * turn instead (when GROQ_API_KEY is set); Gemini's budget is shortened so that still fits in 60 s.
 */
async function runTurn(systemInstruction: string, history: HistoryTurn[]): Promise<QuizTurn> {
  if (!process.env.GROQ_API_KEY) return runQuizTurn(systemInstruction, history);
  try {
    return await runQuizTurn(systemInstruction, history, 30_000);
  } catch (error) {
    console.warn("Gemini unavailable for the check-in, using Groq:", error instanceof Error ? error.message.slice(0, 200) : error);
    return runGroqJsonTurn<QuizTurn>(systemInstruction, history);
  }
}

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
      voiceTone: parsed.data.voiceTone,
      runTurn,
      describePhoto: (dataUrl) => {
        const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
        return match ? describePhoto(match[2], match[1]) : Promise.resolve("");
      },
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ sessionId: result.sessionId, turn: result.turn, speech: result.speech ?? null, voiceTone: result.voiceTone ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The AI quiz assistant is unavailable right now." }, { status: 502 });
  }
}
