import { NextResponse } from "next/server";
import { createInviteCode, getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const code = createInviteCode(patient.id);
  const url = new URL(`/join?code=${encodeURIComponent(code)}`, new URL(request.url).origin).toString();
  return NextResponse.json({ code, url });
}
