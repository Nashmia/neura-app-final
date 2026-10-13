import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, patient: null });
  const patient = await findPatientForUser(await getCollections(), user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, patient });
}
