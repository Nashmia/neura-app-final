import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, getCollections, withoutMongoId } from "@/lib/db";
import { quizQuestions } from "@/lib/quiz-data";

const schema = z.object({ answers: z.record(z.string(), z.string()) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid quiz answers." }, { status: 400 });
  const { patients, quizSessions } = await getCollections();
  const patient = await patients.findOne({ userId: user.id }, withoutMongoId);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const score = quizQuestions.reduce((count, question) => count + (parsed.data.answers[question.id] === question.answer ? 1 : 0), 0);
  const session = { id: createId("session"), userId: user.id, patientId: patient.id, score, total: quizQuestions.length, createdAt: new Date().toISOString() };
  await quizSessions.insertOne(session);
  return NextResponse.json({ session });
}
