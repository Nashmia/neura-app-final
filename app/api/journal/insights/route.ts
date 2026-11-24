import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { notesWithEmbeddings } from "@/lib/journal-embeddings";
import { caregiverStrain, findThemes, MIN_THEME_NOTES, moodAnomaly } from "@/lib/journal-insights";

export const maxDuration = 30;

/** Journal insights: recurring themes (k-means on note embeddings), caregiver strain (VADER) and mood anomaly. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const entries = await collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray();
  // Themes need embeddings; if Gemini is unavailable the other insights still show.
  let themes: ReturnType<typeof findThemes> = null;
  let themesError: string | undefined;
  try {
    themes = findThemes(await notesWithEmbeddings(collections, patient.id));
  } catch (error) {
    console.error(error);
    themesError = "Themes are unavailable right now.";
  }
  const emotions = entries.filter((e) => e.emotion).map((e) => e.emotion!.label);
  const emotionCounts = Object.entries(emotions.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l]: (acc[l] ?? 0) + 1 }), {}))
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    themes,
    themesError,
    minThemeNotes: MIN_THEME_NOTES,
    strain: caregiverStrain(entries),
    moodAnomaly: moodAnomaly(entries),
    emotions: emotionCounts,
  });
}
