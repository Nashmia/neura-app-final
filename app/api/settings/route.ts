import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, patient: null, caregivers: [] });

  const caregivers = (
    await Promise.all(patient.caregiverIds.map((id) => collections.users.findOne({ id }, withoutMongoId)))
  )
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    patient: { id: patient.id, name: patient.name },
    caregivers,
  });
}
