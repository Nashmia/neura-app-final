import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createId, findPatientForUser, getCollections } from "@/lib/db";
import type { Contact } from "@/lib/types";

const schema = z.object({
  patientName: z.string().min(2),
  age: z.coerce.number().min(1).max(120),
  gender: z.string().min(2),
  dementiaStage: z.string().min(2),
  notes: z.string().optional().default(""),
  contacts: z
    .array(
      z.object({
        name: z.string().optional().default(""),
        relationship: z.string().optional().default(""),
        type: z.enum(["Family", "Friend"]),
        notes: z.string().optional().default(""),
        photo: z.string().max(3_000_000).optional().default(""),
      })
    )
    .optional()
    .default([]),
  quizLength: z.coerce.number().min(3).max(20),
  quizDifficulty: z.string().min(2),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });

  // Give each person a stable id, and derive the family/friend counts from the
  // actual list so they can never drift out of sync with the entered people.
  const contacts: Contact[] = parsed.data.contacts
    .filter((person) => person.name.trim())
    .map((person) => ({
      id: createId("contact"),
      name: person.name.trim(),
      relationship: person.relationship.trim(),
      type: person.type,
      notes: person.notes,
      photo: person.photo,
    }));
  const familyCount = contacts.filter((c) => c.type === "Family").length;
  const friendsCount = contacts.filter((c) => c.type === "Friend").length;

  const collections = await getCollections();
  const { patients } = collections;
  const existing = await findPatientForUser(collections, user.id);
  const now = new Date().toISOString();

  if (existing) {
    const updates = {
      name: parsed.data.patientName,
      age: parsed.data.age,
      gender: parsed.data.gender,
      dementiaStage: parsed.data.dementiaStage,
      notes: parsed.data.notes,
      contacts,
      familyCount,
      friendsCount,
      quizLength: parsed.data.quizLength,
      quizDifficulty: parsed.data.quizDifficulty,
      updatedAt: now,
    };
    await patients.updateOne({ id: existing.id }, { $set: updates });
    return NextResponse.json({ patient: { ...existing, ...updates } });
  }

  const patient = {
    id: createId("patient"),
    userId: user.id,
    caregiverIds: [user.id],
    name: parsed.data.patientName,
    age: parsed.data.age,
    gender: parsed.data.gender,
    dementiaStage: parsed.data.dementiaStage,
    notes: parsed.data.notes,
    contacts,
    familyCount,
    friendsCount,
    quizLength: parsed.data.quizLength,
    quizDifficulty: parsed.data.quizDifficulty,
    createdAt: now,
    updatedAt: now,
  };

  await patients.insertOne(patient);

  return NextResponse.json({ patient });
}
