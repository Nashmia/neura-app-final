import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // about 8 minutes of compressed speech; recordings stop at 60 s anyway

/**
 * Speech to text for voice answers and questions: the browser records a short
 * clip and this sends it to OpenAI's Whisper model on Groq. Nothing is stored.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice input isn't set up yet. Please type instead." }, { status: 503 });

  const limit = await checkRateLimit(user.id, "transcribe");
  if (!limit.ok) return NextResponse.json({ error: limit.message }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "No recording received. Please try again." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "That recording is too long. Please keep it under a minute." }, { status: 413 });

  const upstream = new FormData();
  const type = audio.type || "audio/webm";
  upstream.append("file", audio, `speech.${type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm"}`);
  upstream.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3");
  upstream.append("response_format", "json");
  upstream.append("temperature", "0");

  try {
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      console.error("Transcription failed:", r.status, (await r.text()).slice(0, 300));
      return NextResponse.json({ error: "Couldn't understand the recording right now. Please try again or type instead." }, { status: 502 });
    }
    const data = (await r.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "I didn't catch any words. Please try again, a little closer to the microphone." }, { status: 422 });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Voice input timed out. Please try again or type instead." }, { status: 504 });
  }
}
