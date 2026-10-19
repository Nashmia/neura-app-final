"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { cn, redirectToLogin } from "@/lib/utils";

const MAX_SECONDS = 60;

/**
 * Tap to record, tap again to stop; the clip is transcribed by Whisper
 * (/api/transcribe) and the words are handed to `onText`. Typing always
 * still works. Hidden in browsers that can't record audio.
 */
export function VoiceInputButton({ onText, onError, disabled, className }: {
  onText: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void transcribe(new Blob(chunks.current, { type: rec.mimeType || type || "audio/webm" }));
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      onError(denied ? "Microphone access was blocked. Allow the microphone in your browser's address bar, or type instead." : "Couldn't start the microphone. Please type instead.");
      setState("idle");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") {
      setState("transcribing");
      recorder.current.stop();
    }
  }

  async function transcribe(blob: Blob) {
    if (blob.size < 1000) {
      setState("idle");
      onError("That recording was too short. Hold on a moment after tapping, then speak.");
      return;
    }
    try {
      const form = new FormData();
      form.append("audio", blob);
      const r = await fetch("/api/transcribe", { method: "POST", body: form });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't understand the recording.");
      onText(d.text);
    } catch (err) {
      onError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Please type instead.");
    } finally {
      setState("idle");
    }
  }

  if (!supported) return null;
  const recording = state === "recording";
  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={disabled || state === "transcribing"}
      aria-pressed={recording}
      aria-label={recording ? `Stop recording (${seconds} seconds)` : state === "transcribing" ? "Turning your speech into text" : "Speak instead of typing"}
      title={recording ? "Tap to stop" : "Speak instead of typing"}
      className={cn(
        "relative grid size-14 shrink-0 place-items-center rounded-2xl border transition disabled:opacity-60",
        recording ? "border-red-300 bg-red-50 text-red-600" : "border-border bg-white text-navy hover:bg-lavender",
        className,
      )}
    >
      {state === "transcribing" ? <Loader2 className="size-5 animate-spin" /> : recording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
      {recording && (
        <span className="absolute -top-2 right-0 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold tabular-nums text-white">
          {seconds}s
        </span>
      )}
    </button>
  );
}
