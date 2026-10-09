import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

const createSchema = z.object({
  text: z.string().max(2000).default(""),
  moodTag: z.enum(["Calm", "Anxious", "Confused", "Happy", "Tired"]).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ entries: [] });
  const list = await collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray();
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ entries: list });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid journal entry." }, { status: 400 });
  if (!parsed.data.text.trim() && !parsed.data.moodTag) {
    return NextResponse.json({ error: "Add a note or select a mood." }, { status: 400 });
  }
  const collections = await getCollections();
  const { journalEntries } = collections;
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });
  const entry = {
    id: createId("journal"),
    userId: user.id,
    patientId: patient.id,
    text: parsed.data.text.trim(),
    moodTag: parsed.data.moodTag,
    createdAt: new Date().toISOString(),
  };
  await journalEntries.insertOne(entry);
  return NextResponse.json({ entry });
}
