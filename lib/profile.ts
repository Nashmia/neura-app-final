import { z } from "zod";
import { QUIZ_MAX_QUESTIONS, QUIZ_MIN_QUESTIONS } from "@/lib/quiz-limits";
import { createId, findPatientForUser, type DataCollection } from "@/lib/db";
import type { Contact, Patient, User } from "@/lib/types";

/**
 * Caregiver and patient profile rules, shared by onboarding (create) and the
 * settings page (edit). Every function takes the caregiver's own user id and
 * only ever touches that caregiver's records.
 */

const contactInput = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(""),
  relationship: z.string().optional().default(""),
  type: z.enum(["Family", "Friend"]),
  notes: z.string().max(1000).optional().default(""),
  photo: z.string().max(3_000_000).optional().default(""),
});

export const patientInput = z.object({
  patientName: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().trim().min(2).max(40),
  dementiaStage: z.string().trim().min(2).max(60),
  notes: z.string().max(5000).optional().default(""),
  contacts: z.array(contactInput).max(50).optional().default([]),
  quizLength: z.coerce.number().int().min(QUIZ_MIN_QUESTIONS).max(QUIZ_MAX_QUESTIONS),
  quizDifficulty: z.string().trim().min(2).max(40),
});
export type PatientInput = z.infer<typeof patientInput>;

export const caregiverInput = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(120),
  phone: z.string().trim().min(8, "Enter a phone number with at least 8 digits.").max(30),
});

/**
 * Turn submitted contacts into stored ones. Existing contacts keep their id
 * (so nothing that refers to them breaks); blank rows are dropped; the
 * family/friend counts are always derived from the list.
 */
function buildContacts(input: PatientInput["contacts"], existing: Contact[] = []) {
  const known = new Set(existing.map((c) => c.id));
  const contacts: Contact[] = input
    .filter((person) => person.name.trim())
    .map((person) => ({
      id: person.id && known.has(person.id) ? person.id : createId("contact"),
      name: person.name.trim(),
      relationship: person.relationship.trim(),
      type: person.type,
      notes: person.notes,
      photo: person.photo,
    }));
  return {
    contacts,
    familyCount: contacts.filter((c) => c.type === "Family").length,
    friendsCount: contacts.filter((c) => c.type === "Friend").length,
  };
}

function patientFields(data: PatientInput, existing?: Contact[]) {
  return {
    name: data.patientName,
    age: data.age,
    gender: data.gender,
    dementiaStage: data.dementiaStage,
    notes: data.notes,
    ...buildContacts(data.contacts, existing),
    quizLength: data.quizLength,
    quizDifficulty: data.quizDifficulty,
  };
}

type Collections = { patients: DataCollection<Patient> };

/**
 * First-time onboarding. Creates the patient only if this caregiver has none;
 * otherwise it refuses, so repeating onboarding can neither overwrite an
 * existing profile nor create a duplicate.
 */
export async function createPatientForCaregiver(collections: Collections, userId: string, data: PatientInput) {
  if (await findPatientForUser(collections, userId)) return { ok: false as const, reason: "exists" as const };
  const now = new Date().toISOString();
  const patient: Patient = {
    id: createId("patient"),
    userId,
    caregiverIds: [userId],
    ...patientFields(data),
    createdAt: now,
    updatedAt: now,
  };
  await collections.patients.insertOne(patient);
  return { ok: true as const, patient };
}

/**
 * Edit the caregiver's existing patient in place. Only profile fields change:
 * id, caregivers, createdAt, and every medication, journal, appointment and
 * quiz record (all keyed by patient id) are left untouched.
 */
export async function updatePatientForCaregiver(collections: Collections, userId: string, data: PatientInput) {
  const existing = await findPatientForUser(collections, userId);
  if (!existing) return { ok: false as const, reason: "missing" as const };
  const updates = { ...patientFields(data, existing.contacts), updatedAt: new Date().toISOString() };
  await collections.patients.updateOne({ id: existing.id }, { $set: updates });
  return { ok: true as const, patient: { ...existing, ...updates } };
}

/** Name and phone only. Email is the sign-in identity and isn't changed here. */
export async function updateCaregiver(collections: { users: DataCollection<User> }, userId: string, data: z.infer<typeof caregiverInput>) {
  await collections.users.updateOne({ id: userId }, { $set: { name: data.name, phone: data.phone } });
  const user = await collections.users.findOne({ id: userId });
  return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null;
}
