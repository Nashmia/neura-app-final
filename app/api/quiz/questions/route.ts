import { NextResponse } from "next/server";
import { quizQuestions } from "@/lib/quiz-data";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  return NextResponse.json({ questions: quizQuestions.map(({ answer, ...question }) => question) });
}
