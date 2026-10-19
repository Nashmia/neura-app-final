import { NextResponse } from "next/server";
import { createDoctorShareCode, DOCTOR_LINK_TTL_MS, getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";

/** Create a read-only doctor link for the caregiver's patient (valid 7 days). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const patient = await findPatientForUser(await getCollections(), user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const code = createDoctorShareCode(patient.id, patient.doctorShareVersion ?? 0);
  const url = new URL(`/doctor/${encodeURIComponent(code)}`, new URL(request.url).origin).toString();
  return NextResponse.json({ url, expiresAt: Date.now() + DOCTOR_LINK_TTL_MS });
}

/** Revoke every doctor link issued so far for this patient. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  await collections.patients.updateOne({ id: patient.id }, { $set: { doctorShareVersion: (patient.doctorShareVersion ?? 0) + 1 } });
  return NextResponse.json({ revoked: true });
}
