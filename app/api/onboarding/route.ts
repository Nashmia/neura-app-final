import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollections } from "@/lib/db";
import { createPatientForCaregiver, patientInput } from "@/lib/profile";

/**
 * First-time setup only. A caregiver who already has a patient gets 409: the
 * profile is edited from Settings (PATCH /api/patient), so a repeated or stale
 * onboarding submission can't overwrite it or create a second patient.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = patientInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });

  const result = await createPatientForCaregiver(await getCollections(), user.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: "Setup is already complete. You can edit the patient's details in Settings." }, { status: 409 });
  }
  return NextResponse.json({ patient: result.patient });
}
