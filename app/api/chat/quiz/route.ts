import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/chat-validation";
import { findPatientForUser, getCollections } from "@/lib/db";
import { runQuizTurn } from "@/lib/gemini";
import { handleQuizTurn } from "@/lib/quiz";
import { QUIZ_MAX_ANSWER_CHARS } from "@/lib/quiz-limits";

// A single Gemini call can occasionally take longer than Vercel's default
// serverless timeout, especially under provider load — give it more room.
export const maxDuration = 60;

// The client sends only the session ID and its latest answer; the transcript lives on the server
// (see lib/quiz.ts). Any other field, such as a client-built history, is ignored.
const schema = z.object({
  sessionId: z.string().min(1).max(100).optional(),
  answer: z.string().max(QUIZ_MAX_ANSWER_CHARS * 2).optional(),
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

  try {
    const result = await handleQuizTurn({
      collections,
      userId: user.id,
      patient,
      sessionId: parsed.data.sessionId,
      answer: parsed.data.answer,
      runTurn: runQuizTurn,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ sessionId: result.sessionId, turn: result.turn });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The AI quiz assistant is unavailable right now." }, { status: 502 });
  }
}
