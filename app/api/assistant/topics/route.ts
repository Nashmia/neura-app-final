import { NextResponse } from "next/server";
import { TOPICS } from "@/lib/assistant-topics";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";

/** How often each topic came up in Care Assistant questions over the last 30 days. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ topics: [] });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await collections.assistantTopics.find({ patientId: patient.id }, withoutMongoId).toArray()).filter((r) => r.createdAt >= since);
  const topics = TOPICS.map((t) => ({ id: t.id, label: t.label, count: rows.filter((r) => r.topic === t.id).length }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
  return NextResponse.json({ topics, total: rows.length });
}
