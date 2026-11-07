import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeSpeechMarkers, type WordTiming } from "@/lib/speech-markers";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // about 8 minutes of compressed speech; recordings stop at 60 s anyway

/**
 * Speech to text for voice answers and questions: the browser records a short
 * clip and this sends it to OpenAI's Whisper model on Groq. Nothing is stored here.
 *
 * Whisper also returns each word's timing, from which we compute speech markers (pace, pauses,
 * delay before answering, fillers; see lib/speech-markers.ts). The check-in saves those with the
 * answer. The prompt nudges Whisper to keep "um"/"uh", which it otherwise tends to tidy away.
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
  upstream.append("response_format", "verbose_json");
  upstream.append("timestamp_granularities[]", "word");
  upstream.append("timestamp_granularities[]", "segment");
  upstream.append("prompt", "Umm, let me think... uh, hmm. Well, I- I think it's, er, Tuesday.");
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
    const data = (await r.json()) as { text?: string; duration?: number; words?: WordTiming[] };
    const text = (data.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "I didn't catch any words. Please try again, a little closer to the microphone." }, { status: 422 });
    const speech = Array.isArray(data.words) ? computeSpeechMarkers(data.words, Number(data.duration) || 0) : null;
    return NextResponse.json({ text, speech });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Voice input timed out. Please try again or type instead." }, { status: 504 });
  }
}
