import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollections, withoutMongoId } from "@/lib/db";

const fallbackChart = [
  { day: "Mon", score: 72 },
  { day: "Tue", score: 76 },
  { day: "Wed", score: 70 },
  { day: "Thu", score: 81 },
  { day: "Fri", score: 79 },
  { day: "Sat", score: 84 },
  { day: "Sun", score: 82 },
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { patients, medications: medsCol, quizSessions } = await getCollections();
  const patient = await patients.findOne({ userId: user.id }, withoutMongoId);
  if (!patient) return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, patient: null });

  const medications = await medsCol.find({ patientId: patient.id }, withoutMongoId).toArray();
  const sessions = await quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray();
  const latest = sessions.at(-1);
  const score = latest ? Math.round((latest.score / latest.total) * 100) : 82;
  const taken = medications.filter((item) => item.status === "Taken").length;

  const metrics = [
    { label: "Quiz Score", value: `${score}%`, helper: latest ? "Latest completed quiz" : "Sample baseline until first quiz" },
    { label: "Medication", value: `${taken}/${medications.length || 0}`, helper: medications.some((m) => m.status === "Pending") ? "Some doses pending" : "All doses completed" },
    { label: "Sessions", value: String(sessions.length), helper: "Completed quiz sessions" },
    { label: "Care Status", value: "Stable", helper: "No urgent alerts" },
  ];

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    patient,
    medications,
    sessions,
    metrics,
    chart: sessions.length
      ? sessions.slice(-7).map((session, index) => ({ day: `S${index + 1}`, score: Math.round((session.score / session.total) * 100) }))
      : fallbackChart,
    notifications: [
      { title: "Medication reminder", description: medications.some((m) => m.status === "Pending") ? "One medicine is still pending today." : "All medicines are marked as taken." },
      { title: "Quiz progress", description: latest ? `Latest quiz score was ${score}%.` : "No quiz submitted yet. Start a calm session today." },
      { title: "Profile ready", description: `${patient.name}'s care profile is active.` },
    ],
  });
}
