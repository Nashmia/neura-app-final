import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { embedEntry } from "@/lib/journal-embeddings";
import type { JournalEntry } from "@/lib/types";

const createSchema = z.object({
  text: z.string().max(2000).default(""),
  moodTag: z.enum(["Calm", "Anxious", "Confused", "Happy", "Tired"]).optional(),
  // What the in-browser emotion model read in the note, when it ran (tracking information only).
  emotion: z.object({ label: z.enum(["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]), score: z.number().min(0).max(1) }).optional(),
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
  const text = parsed.data.text.trim();
  const entry: JournalEntry = {
    id: createId("journal"),
    userId: user.id,
    patientId: patient.id,
    text,
    moodTag: parsed.data.moodTag,
    ...(text && parsed.data.emotion ? { emotion: { label: parsed.data.emotion.label, score: Math.round(parsed.data.emotion.score * 100) / 100 } } : {}),
    createdAt: new Date().toISOString(),
  };
  await journalEntries.insertOne(entry);
  // Embed the note for search and themes. Failure is fine: the search backfills missing notes later.
  await embedEntry(collections.journalEmbeddings, entry);
  return NextResponse.json({ entry });
}
