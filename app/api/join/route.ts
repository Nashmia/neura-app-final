import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, verifyInviteCode } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

const schema = z.object({ code: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invite code is required." }, { status: 400 });

  const patientId = verifyInviteCode(parsed.data.code);
  if (!patientId) return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });

  const collections = await getCollections();
  const patient = await collections.patients.findOne({ id: patientId }, withoutMongoId);
  if (!patient) return NextResponse.json({ error: "This invite link no longer points to a valid patient." }, { status: 404 });

  if (patient.caregiverIds.includes(user.id)) {
    return NextResponse.json({ patient: { id: patient.id, name: patient.name } });
  }

  const existing = await findPatientForUser(collections, user.id);
  if (existing) {
    return NextResponse.json({ error: "Your account is already caring for a different patient profile." }, { status: 409 });
  }

  await collections.patients.updateOne({ id: patient.id }, { $set: { caregiverIds: [...patient.caregiverIds, user.id] } });
  return NextResponse.json({ patient: { id: patient.id, name: patient.name } });
}
