import { NextResponse } from "next/server";
import { z } from "zod";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid login details." }, { status: 400 });

  const collections = await getCollections();
  const user = await collections.users.findOne({ email: parsed.data.email.toLowerCase() }, withoutMongoId);
  if (!user || user.passwordHash !== hashPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await setSession(user.id);
  const patient = await findPatientForUser(collections, user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, hasPatient: Boolean(patient) });
}
