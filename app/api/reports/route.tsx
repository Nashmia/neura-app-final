import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#0f172a" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  label: { color: "#334155" },
  value: { color: "#0f172a", fontWeight: 700 },
  muted: { color: "#64748b", fontSize: 10 },
  note: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(JSON.stringify({ error: "Please log in first." }), { status: 401, headers: { "Content-Type": "application/json" } });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return new Response(JSON.stringify({ error: "Complete onboarding first." }), { status: 400, headers: { "Content-Type": "application/json" } });

  const [medications, sessions, appointments, journalEntries] = await Promise.all([
    collections.medications.find({ patientId: patient.id }, withoutMongoId).toArray(),
    collections.quizSessions.find({ patientId: patient.id }, withoutMongoId).toArray(),
    collections.appointments.find({ patientId: patient.id }, withoutMongoId).toArray(),
    collections.journalEntries.find({ patientId: patient.id }, withoutMongoId).toArray(),
  ]);

  const takenCount = medications.filter((m) => m.status === "Taken").length;
  const recentSessions = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentNotes = [...journalEntries]
    .filter((e) => e.text)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const upcoming = appointments
    .filter((a) => a.status === "Upcoming")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 5);

  const generatedAt = new Date().toLocaleString();

  const doc = (
    <Document title={`${patient.name} - Care Report`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{patient.name}'s Care Report</Text>
        <Text style={styles.subtitle}>
          Age {patient.age} • {patient.dementiaStage} dementia • Generated {generatedAt}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Adherence</Text>
          <Text style={styles.muted}>{takenCount} of {medications.length} doses currently marked as taken.</Text>
          {medications.map((m) => (
            <View key={m.id} style={styles.row}>
              <Text style={styles.label}>{m.name} ({m.dosage}) • {m.time}</Text>
              <Text style={styles.value}>{m.status}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Cognitive Check-ins</Text>
          {recentSessions.length === 0 && <Text style={styles.muted}>No quiz sessions completed yet.</Text>}
          {recentSessions.map((s) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.label}>{new Date(s.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.value}>{s.score} / {s.total}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {upcoming.length === 0 && <Text style={styles.muted}>None scheduled.</Text>}
          {upcoming.map((a) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.label}>{a.title} ({a.type})</Text>
              <Text style={styles.value}>{a.date} {a.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Caregiver Notes</Text>
          {recentNotes.length === 0 && <Text style={styles.muted}>No journal notes recorded yet.</Text>}
          {recentNotes.map((n) => (
            <View key={n.id} style={styles.note}>
              <Text style={styles.muted}>{new Date(n.createdAt).toLocaleString()}{n.moodTag ? ` • Mood: ${n.moodTag}` : ""}</Text>
              <Text>{n.text}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const fileName = `${patient.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-care-report.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
