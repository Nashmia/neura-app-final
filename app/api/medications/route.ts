import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, getCollections, withoutMongoId } from "@/lib/db";

const createSchema = z.object({ name: z.string().min(2), dosage: z.string().min(1), time: z.string().min(1) });
const updateSchema = z.object({ id: z.string(), status: z.enum(["Taken", "Pending"]) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const { medications } = await getCollections();
  const list = await medications.find({ userId: user.id }, withoutMongoId).toArray();
  return NextResponse.json({ medications: list });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter medication name, dosage, and time." }, { status: 400 });
  const { patients, medications } = await getCollections();
  const patient = await patients.findOne({ userId: user.id }, withoutMongoId);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });
  const medication = { id: createId("med"), userId: user.id, patientId: patient.id, name: parsed.data.name, dosage: parsed.data.dosage, time: parsed.data.time, status: "Pending" as const };
  await medications.insertOne(medication);
  return NextResponse.json({ medication });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid medication update." }, { status: 400 });
  const { medications } = await getCollections();
  const result = await medications.findOneAndUpdate(
    { id: parsed.data.id, userId: user.id },
    { $set: { status: parsed.data.status } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  if (!result) return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  return NextResponse.json({ medication: result });
}
