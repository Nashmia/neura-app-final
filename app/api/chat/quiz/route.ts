import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, findPatientForUser, getCollections } from "@/lib/db";
import { runQuizTurn } from "@/lib/gemini";

const schema = z.object({
  history: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string() })),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const collections = await getCollections();
  const { quizSessions } = collections;
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const questionCount = Math.min(Math.max(patient.quizLength || 5, 3), 8);
  const familiarNames = patient.contacts?.length
    ? patient.contacts.map((c) => `${c.name} (${c.relationship})`).join(", ")
    : "no listed contacts";

  const systemInstruction = `You are Neura, a warm and patient AI cognitive-support companion running a short conversational memory check-in for a dementia patient named ${patient.name} (age ${patient.age}, ${patient.dementiaStage} stage dementia). Their known family/friends: ${familiarNames}.

Conduct a gentle, conversational cognitive quiz of exactly ${questionCount} questions, one at a time, calibrated to a "${patient.quizDifficulty || "easy"}" difficulty. Ask about orientation (day/time/season), recall of the listed family/friends, daily routine, and simple recognition. Never ask anything upsetting, medical, or that could embarrass the patient if missed. Keep every message short, warm, and in large-print-friendly plain language. The patient answers in their own words — do not offer multiple-choice options.

Always respond with ONLY a JSON object matching the schema, nothing else.
- For each of the first ${questionCount} questions: "type" is "question", "questionNumber" is a 1-based counter, "total" is ${questionCount}, and "message" is the question text.
- After the patient has answered the ${questionCount}th question, respond exactly once more with "type" "complete", "total" ${questionCount}, an integer "score" out of ${questionCount} (grade charitably, giving partial/full credit for answers that are close or show genuine recognition even if not word-perfect), a short encouraging caregiver-facing "summary" (2-3 sentences describing how the check-in went), and a warm closing "message" for the patient.`;

  let turn;
  try {
    turn = await runQuizTurn(systemInstruction, parsed.data.history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The AI quiz assistant is unavailable right now." }, { status: 502 });
  }

  if (turn.type === "complete") {
    const session = {
      id: createId("session"),
      userId: user.id,
      patientId: patient.id,
      score: turn.score,
      total: turn.total,
      summary: turn.summary,
      createdAt: new Date().toISOString(),
    };
    await quizSessions.insertOne(session);
  }

  return NextResponse.json({ turn });
}
