import { config } from "dotenv";
config({ path: ".env.local" });

import { findPatientForUser, getCollections, withoutMongoId } from "../lib/db";

// Read-only: summarises one account's patient and records. Never prints password hashes.
async function main() {
  const email = (process.argv[2] || "").toLowerCase();
  const c = await getCollections();
  const user = await c.users.findOne({ email }, withoutMongoId);
  if (!user) {
    console.log(`No account for ${email}`);
    process.exit(0);
  }
  const patient = await findPatientForUser(c, user.id);
  console.log(`Account: ${user.name} <${user.email}> id=${user.id} created=${user.createdAt}`);
  if (!patient) {
    console.log("No patient profile yet.");
    process.exit(0);
  }
  const { contacts, ...rest } = patient;
  console.log("Patient:", JSON.stringify({ ...rest, contacts: contacts.map((x) => ({ name: x.name, relationship: x.relationship, type: x.type, photo: Boolean(x.photo) })) }, null, 1));
  const q = { patientId: patient.id };
  const [meds, appts, journal, sessions] = await Promise.all([
    c.medications.find(q, withoutMongoId).toArray(),
    c.appointments.find(q, withoutMongoId).toArray(),
    c.journalEntries.find(q, withoutMongoId).toArray(),
    c.quizSessions.find(q, withoutMongoId).toArray(),
  ]);
  console.log("Medications:", meds.map((m) => `${m.name} ${m.dosage} ${m.time} [${m.status}]`));
  console.log("Appointments:", appts.map((a) => `${a.date} ${a.time} ${a.title} [${a.status}]`));
  console.log("Journal:", journal.length, journal.map((j) => `${j.createdAt.slice(0, 16)} ${j.moodTag ?? ""} ${j.text.slice(0, 40)}`));
  console.log("Check-ins:", sessions.map((s) => `${s.createdAt.slice(0, 16)} ${s.score}/${s.total}`));
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
