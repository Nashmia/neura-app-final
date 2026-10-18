import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(["Doctor", "Therapy", "Other"]),
  // Shapes produced by <input type="date"> and <input type="time">.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
const updateSchema = z.object({ id: z.string(), status: z.enum(["Upcoming", "Cancelled"]) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ appointments: [] });
  const list = await collections.appointments.find({ patientId: patient.id }, withoutMongoId).toArray();
  list.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return NextResponse.json({ appointments: list });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a title, type, date, and time." }, { status: 400 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });
  const appointment = {
    id: createId("appt"),
    userId: user.id,
    patientId: patient.id,
    title: parsed.data.title,
    type: parsed.data.type,
    date: parsed.data.date,
    time: parsed.data.time,
    location: parsed.data.location,
    notes: parsed.data.notes,
    status: "Upcoming" as const,
    createdAt: new Date().toISOString(),
  };
  await collections.appointments.insertOne(appointment);
  return NextResponse.json({ appointment });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid appointment update." }, { status: 400 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  const result = await collections.appointments.findOneAndUpdate(
    { id: parsed.data.id, patientId: patient.id },
    { $set: { status: parsed.data.status } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  if (!result) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  return NextResponse.json({ appointment: result });
}
