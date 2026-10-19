import { config } from "dotenv";
config({ path: ".env.local" });

import { findPatientForUser, getCollections, withoutMongoId } from "../lib/db";
import { getMongoDb } from "../lib/mongodb";
import type { Appointment, Contact, JournalEntry, Medication, QuizSession } from "../lib/types";

/**
 * Demo data for a presentation: one week (Mon 12 – Mon 19 Oct 2026) of care
 * records for one account's patient.
 *
 *   npx tsx --conditions=react-server scripts/seed-demo-week.ts <email>            dry run (prints what it would add)
 *   npx tsx --conditions=react-server scripts/seed-demo-week.ts <email> --apply    adds the data
 *   npx tsx --conditions=react-server scripts/seed-demo-week.ts <email> --remove   removes it again
 *
 * Only adds records; nothing that already exists is changed or deleted, except
 * that the patient's empty medical notes and empty family list are filled in
 * (--remove empties them again). Every added record's id starts with "demo_".
 */

const TZ_OFFSET = "+05:00"; // Asia/Karachi, the app's time zone
const at = (date: string, hm: string) => new Date(`${date}T${hm}:00${TZ_OFFSET}`).toISOString();
let n = 0;
const id = (kind: string) => `demo_${kind}_${String(++n).padStart(3, "0")}`;

const DEMO_NOTES =
  "Takes morning tablets with breakfast. Mild hearing loss in the left ear, so speak on her right. Enjoys gardening, old family photos and 1960s music. More confused in the late afternoon (sundowning).";

const DEMO_CONTACTS: Omit<Contact, "id">[] = [
  { name: "Jackie", relationship: "Daughter (main caregiver)", type: "Family", notes: "Lives with Jane", photo: "" },
  { name: "Michael", relationship: "Son", type: "Family", notes: "Visits on weekends", photo: "" },
  { name: "Emma", relationship: "Granddaughter", type: "Family", notes: "Michael's daughter, age 9", photo: "" },
  { name: "Margaret", relationship: "Neighbour and old friend", type: "Friend", notes: "Morning walks together", photo: "" },
];

function build(userId: string, patientId: string) {
  const base = { userId, patientId };

  const medications: Medication[] = [
    { id: id("med"), ...base, name: "Donepezil", dosage: "10mg", time: "08:00 AM", status: "Taken" },
    { id: id("med"), ...base, name: "Sertraline", dosage: "50mg", time: "09:00 AM", status: "Taken" },
    { id: id("med"), ...base, name: "Vitamin D3", dosage: "1000 IU", time: "01:00 PM", status: "Pending" },
    { id: id("med"), ...base, name: "Memantine", dosage: "10mg", time: "09:00 PM", status: "Pending" },
  ];

  const appointments: Appointment[] = [
    { id: id("appt"), ...base, title: "GP check-up", type: "Doctor", date: "2026-10-14", time: "11:00", location: "Clifton Family Clinic", notes: "Blood pressure review; discussed afternoon confusion", status: "Upcoming", createdAt: at("2026-10-12", "10:15") },
    { id: id("appt"), ...base, title: "Neurologist follow-up", type: "Doctor", date: "2026-10-21", time: "10:30", location: "City Hospital, Neurology OPD", notes: "Bring the care report and medication list", status: "Upcoming", createdAt: at("2026-10-14", "16:20") },
    { id: id("appt"), ...base, title: "Occupational therapy", type: "Therapy", date: "2026-10-23", time: "15:00", location: "Memory Care Centre", notes: "Home-safety and daily-routine session", status: "Upcoming", createdAt: at("2026-10-15", "12:00") },
    { id: id("appt"), ...base, title: "Dental check-up", type: "Other", date: "2026-10-27", time: "12:00", location: "Smile Dental", notes: "", status: "Upcoming", createdAt: at("2026-10-16", "18:40") },
  ];

  // Newest first: the dashboard's mood chart reads the newest entries in stored order.
  const journal: Omit<JournalEntry, "id">[] = [
    { ...base, moodTag: "Calm", text: "Good start to the week. Ate a full breakfast and took her morning tablets without fuss.", createdAt: at("2026-10-19", "10:20") },
    { ...base, moodTag: "Happy", text: "Michael, Emma and Margaret came for lunch. Jane recognised everyone and laughed at Emma's stories. Best day this week.", createdAt: at("2026-10-18", "16:30") },
    { ...base, moodTag: "Calm", text: "Quiet day. Sorted old family photos together for an hour; she named most people in them.", createdAt: at("2026-10-17", "15:10") },
    { ...base, text: "Slept badly last night, up twice around 3am looking for the kitchen. Left the hallway light on tonight.", createdAt: at("2026-10-17", "10:00") },
    { ...base, moodTag: "Tired", text: "Very tired after the morning walk with Margaret. Napped for two hours, then a little muddled about the time.", createdAt: at("2026-10-16", "17:45") },
    { ...base, moodTag: "Happy", text: "Watered the garden and hummed along to her old records. Very settled all day.", createdAt: at("2026-10-15", "14:00") },
    { ...base, moodTag: "Confused", text: "After the GP visit she thought it was 1998 and asked where Dad was. Reassured her and she settled after tea.", createdAt: at("2026-10-14", "18:30") },
    { ...base, text: "Asked the same question about lunch about six times before noon. Answering calmly each time helped.", createdAt: at("2026-10-13", "12:30") },
    { ...base, moodTag: "Anxious", text: "Restless and pacing around 5pm, wanted to 'go home'. Dimmed the lights, put on her music; calmer by 7pm.", createdAt: at("2026-10-13", "19:10") },
    { ...base, moodTag: "Calm", text: "Settled day. Did the crossword together over breakfast.", createdAt: at("2026-10-12", "11:00") },
  ];

  const q = (questionNumber: number, question: string, answer: string) => ({ questionNumber, question, answer });
  const sessions: QuizSession[] = [
    { id: id("quiz"), ...base, score: 2, total: 4, createdAt: at("2026-10-12", "11:30"),
      summary: "Jane knew her daughter's name and her morning routine but was unsure of the day and season. Gentle reminders helped.",
      items: [q(1, "Good morning, Jane! What day of the week do you think it is today?", "Sunday, I think"), q(2, "Who is the lady who lives with you and helps you every day?", "Jackie, my girl"), q(3, "What do you usually have for breakfast?", "Toast and tea"), q(4, "What season are we in at the moment?", "Summer?")] },
    { id: id("quiz"), ...base, score: 2, total: 4, createdAt: at("2026-10-13", "11:15"),
      summary: "A slightly unsettled session. She remembered her garden and her son's name, but not the month or what she did yesterday.",
      items: [q(1, "Jane, can you tell me which month we are in?", "June"), q(2, "What is the name of your son?", "Michael"), q(3, "What do you like to grow in your garden?", "Roses and tomatoes"), q(4, "What did you do yesterday?", "I don't remember")] },
    { id: id("quiz"), ...base, score: 2, total: 4, createdAt: at("2026-10-14", "17:20"),
      summary: "A tired, muddled session after the GP visit. Jane recognised her daughter but placed herself in the late 1990s.",
      items: [q(1, "Jane, where did you go this morning?", "To the shops, I think"), q(2, "What year do you think it is?", "1998"), q(3, "Who is sitting with you right now?", "Jackie, my daughter"), q(4, "What would you like for dinner tonight?", "Soup, something warm")] },
    { id: id("quiz"), ...base, score: 3, total: 4, createdAt: at("2026-10-15", "11:40"),
      summary: "A good, relaxed session. Jane answered about family and routine well; the day of the week was the only miss.",
      items: [q(1, "What day is it today, Jane?", "Tuesday"), q(2, "Who comes to visit you at the weekends?", "Michael and little Emma"), q(3, "What time of day do you take your tablets?", "In the morning with breakfast"), q(4, "Who do you go walking with?", "Margaret next door")] },
    { id: id("quiz"), ...base, score: 3, total: 4, createdAt: at("2026-10-16", "10:50"),
      summary: "Steady. She was oriented to the season and recalled her granddaughter; she could not recall the year.",
      items: [q(1, "What season is it now, Jane?", "Autumn, the leaves are falling"), q(2, "What is your granddaughter's name?", "Emma"), q(3, "What year is it?", "1999"), q(4, "What music do you enjoy listening to?", "The old songs, Elvis")] },
    { id: id("quiz"), ...base, score: 3, total: 4, createdAt: at("2026-10-18", "11:05"),
      summary: "Cheerful before the family lunch. Strong recall of people; mixed up the day.",
      items: [q(1, "Who is coming for lunch today?", "Michael and Emma, and Margaret"), q(2, "What day of the week is it?", "Friday"), q(3, "Where do you like to sit in the afternoon?", "In the garden chair"), q(4, "What is your daughter's name?", "Jackie")] },
    { id: id("quiz"), ...base, score: 4, total: 4, createdAt: at("2026-10-19", "10:45"),
      summary: "Jane's best session this week: she answered all four questions, including the day of the week, after a settled night.",
      items: [q(1, "Good morning, Jane! What day is it today?", "Monday, the start of the week"), q(2, "Who visited you yesterday?", "Michael and Emma came, and Margaret"), q(3, "What season are we in?", "Autumn"), q(4, "What do you have with your morning tea?", "Toast with butter")] },
  ];

  return { medications, appointments, journal: journal.map((j) => ({ id: id("journal"), ...j })), sessions };
}

async function main() {
  const email = (process.argv[2] || "").toLowerCase();
  const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--remove") ? "remove" : "dry-run";
  if (!email) throw new Error("Pass the account email.");

  const c = await getCollections();
  const user = await c.users.findOne({ email }, withoutMongoId);
  if (!user) throw new Error(`No account for ${email}`);
  const patient = await findPatientForUser(c, user.id);
  if (!patient) throw new Error("That account has no patient profile.");
  console.log(`Database: ${process.env.MONGODB_URI ? "MongoDB" : "local JSON"} | ${user.name} -> patient ${patient.name} (${patient.id}) | mode: ${mode}`);

  if (mode === "remove") {
    if (!process.env.MONGODB_URI) throw new Error("--remove is implemented for MongoDB only.");
    const db = await getMongoDb();
    for (const name of ["medications", "appointments", "journalEntries", "quizSessions"]) {
      const r = await db.collection(name).deleteMany({ patientId: patient.id, id: { $regex: "^demo_" } });
      console.log(`removed ${r.deletedCount} from ${name}`);
    }
    if (patient.contacts.every((x) => x.id.startsWith("demo_")) && patient.notes === DEMO_NOTES) {
      await c.patients.updateOne({ id: patient.id }, { $set: { contacts: [], familyCount: 0, friendsCount: 0, notes: "", updatedAt: new Date().toISOString() } });
      console.log("patient notes and family list emptied again");
    }
    process.exit(0);
  }

  const existing = await c.medications.find({ patientId: patient.id, id: "demo_med_001" }).toArray();
  if (existing.length) {
    console.log("Demo data is already there; nothing added. Use --remove first to reseed.");
    process.exit(0);
  }

  const data = build(user.id, patient.id);
  const fillProfile = !patient.notes && patient.contacts.length === 0;
  console.log(`would add: ${data.medications.length} medications, ${data.appointments.length} appointments, ${data.journal.length} journal entries, ${data.sessions.length} check-ins${fillProfile ? ", plus medical notes and 4 family/friends" : ""}`);
  if (mode === "dry-run") {
    console.log("Dry run only. Re-run with --apply to write.");
    process.exit(0);
  }

  await c.medications.insertMany(data.medications);
  await c.appointments.insertMany(data.appointments);
  for (const entry of data.journal) await c.journalEntries.insertOne(entry); // keep newest-first order
  for (const s of data.sessions) await c.quizSessions.insertOne(s); // oldest first, latest last
  if (fillProfile) {
    const contacts = DEMO_CONTACTS.map((x, i) => ({ id: `demo_contact_${i + 1}`, ...x }));
    await c.patients.updateOne({ id: patient.id }, {
      $set: { notes: DEMO_NOTES, contacts, familyCount: contacts.filter((x) => x.type === "Family").length, friendsCount: contacts.filter((x) => x.type === "Friend").length, updatedAt: new Date().toISOString() },
    });
  }
  console.log("Added.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
