import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { cachedDigest, createDigest } from "@/lib/digest";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Today's care digest: GET returns the cached one or writes it; POST writes a fresh one. */
async function handle(refresh: boolean) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  if (!refresh) {
    const cached = await cachedDigest(collections.careDigests, patient.id);
    if (cached) return NextResponse.json({ digest: cached });
  }
  const limit = await checkRateLimit(user.id, "digest");
  if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  try {
    const [sessions, journal, medications, appointments] = await Promise.all([
      collections.quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.medications.find({ patientId: patient.id }, withoutMongoId).toArray(),
      collections.appointments.find({ patientId: patient.id }, withoutMongoId).toArray(),
    ]);
    const digest = await createDigest(collections.careDigests, { patient, sessions, journal, medications, appointments });
    return NextResponse.json({ digest });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The care digest couldn't be written right now." }, { status: 502 });
  }
}

export const GET = () => handle(false);
export const POST = () => handle(true);
