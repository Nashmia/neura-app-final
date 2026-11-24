import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";
import { cosineSimilarity, embedText } from "@/lib/embeddings";
import { notesWithEmbeddings } from "@/lib/journal-embeddings";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/** Below this cosine similarity a note is not shown as a match (gemini-embedding-001 scores). */
const MIN_SCORE = 0.55;

/** Semantic journal search: the query and the notes are compared by meaning (Gemini embeddings), not by words. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 300);
  if (!query) return NextResponse.json({ error: "Type something to search for." }, { status: 400 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });
  const limit = await checkRateLimit(user.id, "journalSearch");
  if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  try {
    const [queryVector, notes] = await Promise.all([embedText(query), notesWithEmbeddings(collections, patient.id)]);
    const results = notes
      .map(({ embedding, ...entry }) => ({ entry, score: Math.round(cosineSimilarity(queryVector, embedding) * 100) / 100 }))
      .filter((r) => r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return NextResponse.json({ results, searched: notes.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search by meaning is unavailable right now. Please try again shortly." }, { status: 502 });
  }
}
