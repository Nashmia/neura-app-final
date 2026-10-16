import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

const moodScore: Record<string, number> = { Anxious: 1, Confused: 2, Tired: 3, Calm: 4, Happy: 5 };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const collections = await getCollections();
  const { medications: medsCol, quizSessions, appointments: apptCol, journalEntries: journalCol } = collections;
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, patient: null });

  const medications = await medsCol.find({ patientId: patient.id }, withoutMongoId).toArray();
  const sessions = await quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray();
  const appointments = await apptCol.find({ patientId: patient.id }, withoutMongoId).toArray();
  const journalEntries = await journalCol.find({ patientId: patient.id }, withoutMongoId).toArray();
  const latest = sessions.at(-1);
  const score = latest ? Math.round((latest.score / latest.total) * 100) : null;
  const taken = medications.filter((item) => item.status === "Taken").length;

  const upcomingAppointments = appointments
    .filter((a) => a.status === "Upcoming" && `${a.date}T${a.time}` >= new Date().toISOString())
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 3);

  const moodEntries = journalEntries
    .filter((entry) => entry.moodTag)
    .slice(0, 7)
    .reverse();
  const moodChart = moodEntries.map((entry, index) => ({
    day: new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: "short" }) || `Day ${index + 1}`,
    mood: moodScore[entry.moodTag as string] ?? 3,
  }));

  const metrics = [
    { label: "Quiz Score", value: score === null ? "—" : `${score}%`, helper: latest ? "Latest completed quiz" : "No quiz completed yet" },
    { label: "Medication", value: `${taken}/${medications.length || 0}`, helper: !medications.length ? "No medicines added yet" : medications.some((m) => m.status === "Pending") ? "Some doses pending" : "All doses completed" },
    { label: "Sessions", value: String(sessions.length), helper: "Completed quiz sessions" },
    { label: "Appointments", value: String(upcomingAppointments.length), helper: upcomingAppointments.length ? "Upcoming this week" : "None scheduled" },
  ];

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    patient,
    medications,
    sessions,
    metrics,
    chart: sessions.slice(-7).map((session, index) => ({ day: `S${index + 1}`, score: Math.round((session.score / session.total) * 100) })),
    moodChart,
    upcomingAppointments,
    notifications: [
      { title: "Medication reminder", description: !medications.length ? "No medicines added yet." : medications.some((m) => m.status === "Pending") ? "One medicine is still pending today." : "All medicines are marked as taken." },
      { title: "Quiz progress", description: latest ? `Latest quiz score was ${score}%.` : "No quiz submitted yet. Start a calm session today." },
      {
        title: "Next appointment",
        description: upcomingAppointments[0]
          ? `${upcomingAppointments[0].title} on ${upcomingAppointments[0].date} at ${upcomingAppointments[0].time}.`
          : "No appointments scheduled yet.",
      },
    ],
  });
}
