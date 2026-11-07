import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";
import { scanPrescriptionImage } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// The browser shrinks photos to about 1600 px JPEG first (well under Vercel's 4.5 MB body limit).
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Reads a photo of a prescription, medicine box or pill bottle with Gemini vision and returns the
 * medicines it found, for the caregiver to check and edit before anything is saved. The image is
 * not stored.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const collections = await getCollections();
  const patient = await findPatientForUser(collections, user.id);
  if (!patient) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

  const limit = await checkRateLimit(user.id, "scan");
  if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof Blob) || image.size === 0) return NextResponse.json({ error: "No photo received. Please try again." }, { status: 400 });
  if (!TYPES.includes(image.type)) return NextResponse.json({ error: "Please use a JPEG, PNG or WebP photo." }, { status: 415 });
  if (image.size > MAX_BYTES) return NextResponse.json({ error: "That photo is too large. Please try a smaller one." }, { status: 413 });

  try {
    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const scan = await scanPrescriptionImage(base64, image.type);
    const clean = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
    const medications = (Array.isArray(scan.medications) ? scan.medications : [])
      .slice(0, 12)
      .map((m) => ({
        name: clean(m.name),
        strength: clean(m.strength, 60),
        dose: clean(m.dose, 60),
        frequency: clean(m.frequency, 120),
        times: (Array.isArray(m.times) ? m.times : []).map((t) => clean(t, 20)).filter(Boolean).slice(0, 6),
        instructions: clean(m.instructions, 200),
        confidence: m.confidence === "high" || m.confidence === "medium" ? m.confidence : "low",
      }))
      .filter((m) => m.name);
    return NextResponse.json({
      imageKind: scan.imageKind,
      readable: Boolean(scan.readable),
      medications,
      notes: clean(scan.notes, 400),
    });
  } catch (error) {
    console.error("Prescription scan failed:", error);
    return NextResponse.json({ error: "Couldn't read the photo right now. Please try again in a moment, or add the medicine by hand." }, { status: 502 });
  }
}
