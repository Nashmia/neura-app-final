import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";
import { patientInput, updatePatientForCaregiver } from "@/lib/profile";

/** The signed-in caregiver's patient profile. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const patient = await findPatientForUser(await getCollections(), user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 404 });
  return NextResponse.json({ patient });
}

/** Edit the caregiver's own patient in place (never another caregiver's, never a new record). */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = patientInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields and try again." }, { status: 400 });
  const result = await updatePatientForCaregiver(await getCollections(), user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: "Complete onboarding first." }, { status: 404 });
  return NextResponse.json({ patient: result.patient });
}
