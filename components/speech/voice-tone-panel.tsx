"use client";

import { summarizeVoiceTone, VOICE_LABEL_NAMES, VOICE_LABELS, type VoiceLabel, type VoiceTone } from "@/lib/voice-tone";
import { cn } from "@/lib/utils";

const COLORS: Record<VoiceLabel, string> = { neu: "bg-slate-300", hap: "bg-teal-400", ang: "bg-amber-400", sad: "bg-periwinkle" };

/** How the spoken answers sounded: share of speaking time per tone, as one stacked bar with a legend. */
export function VoiceTonePanel({ tone, className }: { tone: VoiceTone; className?: string }) {
  const summary = summarizeVoiceTone(tone);
  if (!summary) return <p className={cn("text-sm text-slate-500", className)}>Not enough speech to judge the tone. Longer spoken answers give a better reading.</p>;
  return (
    <div className={className}>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface" role="img" aria-label={VOICE_LABELS.map((l) => `${VOICE_LABEL_NAMES[l]} ${Math.round(summary.shares[l] * 100)}%`).join(", ")}>
        {VOICE_LABELS.map((l) => (
          <div key={l} className={COLORS[l]} style={{ width: `${summary.shares[l] * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {VOICE_LABELS.map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", COLORS[l])} aria-hidden />
            {VOICE_LABEL_NAMES[l]} {Math.round(summary.shares[l] * 100)}%
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Mostly {VOICE_LABEL_NAMES[summary.dominant].toLowerCase()} across {Math.round(summary.seconds)} s of speech · measured on this device by a wav2vec2 speech-emotion model. A rough tracking aid: the model learned from younger, acted voices.
      </p>
    </div>
  );
}
