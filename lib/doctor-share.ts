import { verifyDoctorShareCode } from "@/lib/auth";
import { withoutMongoId, type DataCollection } from "@/lib/db";
import type { Appointment, JournalEntry, Medication, Patient, QuizSession, User } from "@/lib/types";

type Collections = {
  users: DataCollection<User>;
  patients: DataCollection<Patient>;
  medications: DataCollection<Medication>;
  quizSessions: DataCollection<QuizSession>;
  appointments: DataCollection<Appointment>;
  journalEntries: DataCollection<JournalEntry>;
};

export type DoctorView =
  | { ok: false; reason: "invalid" | "expired" | "revoked" }
  | {
      ok: true;
      expiresAt: number;
      patient: Patient;
      caregivers: string[];
      medications: Medication[];
      sessions: QuizSession[];
      appointments: Appointment[];
      journal: JournalEntry[];
    };

/**
 * Resolve a doctor share link to the patient's read-only summary.
 * Refused when the signature is wrong, the link has expired, the patient no
 * longer exists, or the caregiver revoked doctor links after it was issued.
 */
export async function loadDoctorView(c: Collections, code: string, now = Date.now()): Promise<DoctorView> {
  const parsed = verifyDoctorShareCode(code, now);
  if (!parsed) return { ok: false, reason: "invalid" };
  if (parsed.expired) return { ok: false, reason: "expired" };
  const patient = await c.patients.findOne({ id: parsed.patientId }, withoutMongoId);
  if (!patient) return { ok: false, reason: "invalid" };
  if ((patient.doctorShareVersion ?? 0) !== parsed.version) return { ok: false, reason: "revoked" };

  const q = { patientId: patient.id };
  const [medications, sessions, appointments, journal, caregivers] = await Promise.all([
    c.medications.find(q, withoutMongoId).toArray(),
    c.quizSessions.find(q, withoutMongoId).toArray(),
    c.appointments.find(q, withoutMongoId).toArray(),
    c.journalEntries.find(q, withoutMongoId).toArray(),
    Promise.all(patient.caregiverIds.map((id) => c.users.findOne({ id }, withoutMongoId))),
  ]);
  return {
    ok: true,
    expiresAt: parsed.expiresAt,
    patient,
    // Caregiver names only: no emails, phones or account details are shared.
    caregivers: caregivers.filter((u): u is User => Boolean(u)).map((u) => u.name),
    medications,
    sessions: [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    appointments: [...appointments].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    journal: [...journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
