"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { summarizeSpeech, type SpeechMarkers, type SpeechSummary } from "@/lib/speech-markers";
import { cn } from "@/lib/utils";

type Metric = {
  key: keyof SpeechSummary;
  label: string;
  unit: string;
  help: string;
  // Which direction is usually the more concerning one, for colouring a change against the baseline.
  worse: "up" | "down";
  // A change smaller than this is shown as "about the same".
  tolerance: number;
};

const METRICS: Metric[] = [
  { key: "speechRateWpm", label: "Speaking pace", unit: "words/min", help: "Words per minute while speaking", worse: "down", tolerance: 10 },
  { key: "pausesPerMinute", label: "Pauses", unit: "per min", help: "Silent gaps of half a second or more between words", worse: "up", tolerance: 1.5 },
  { key: "responseLatencySec", label: "Time to start", unit: "sec", help: "Silence after tapping the mic before the first word", worse: "up", tolerance: 0.7 },
  { key: "fillersPer100Words", label: "Fillers", unit: "per 100 words", help: "“um”, “uh”, “er” and similar", worse: "up", tolerance: 2 },
  { key: "meanPauseSec", label: "Average pause", unit: "sec", help: "Average length of the pauses", worse: "up", tolerance: 0.3 },
  { key: "lexicalDiversity", label: "Word variety", unit: "", help: "Share of different words used (needs 10+ words)", worse: "down", tolerance: 0.08 },
];

function Change({ now, before, metric }: { now: number; before: number; metric: Metric }) {
  const diff = now - before;
  if (Math.abs(diff) < metric.tolerance) {
    return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="size-3" />similar to usual</span>;
  }
  const up = diff > 0;
  const concerning = (up && metric.worse === "up") || (!up && metric.worse === "down");
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", concerning ? "text-amber-700" : "text-emerald-700")}>
      <Icon className="size-3" />
      {up ? "higher" : "lower"} than usual ({before})
    </span>
  );
}

/**
 * Speech markers from spoken check-in answers, optionally compared with an earlier baseline
 * (the same patient's previous check-ins).
 */
export function SpeechMarkersPanel({ speech, baseline, compact }: { speech: SpeechMarkers; baseline?: SpeechMarkers | null; compact?: boolean }) {
  const now = summarizeSpeech(speech);
  const before = baseline ? summarizeSpeech(baseline) : null;
  const shown = METRICS.filter((m) => now[m.key] !== null);

  if (!shown.length) {
    return <p className="text-sm text-slate-500">Not enough speech was recorded to measure. Longer spoken answers give more reliable markers.</p>;
  }

  return (
    <div>
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {shown.map((metric) => {
          const value = now[metric.key] as number;
          const prior = before?.[metric.key];
          return (
            <div key={metric.key} className="rounded-2xl border border-border bg-surface p-3 text-left" title={metric.help}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-ink">{metric.label}</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {value}
                {metric.unit && <span className="ml-1 text-xs font-normal text-slate-500">{metric.unit}</span>}
              </p>
              {typeof prior === "number" && <Change now={value} before={prior} metric={metric} />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        From {now.recordings} voice recording{now.recordings === 1 ? "" : "s"} ({now.wordCount} words)
        {now.longPauseCount ? `, with ${now.longPauseCount} long pause${now.longPauseCount === 1 ? "" : "s"} of 2 s or more` : ""}
        {now.repetitionCount ? `, ${now.repetitionCount} repeated word${now.repetitionCount === 1 ? "" : "s"}` : ""}.
        These are tracking signals to watch over time, not a diagnosis. Tiredness, mood, a noisy room or a new
        microphone can all change them. Share lasting changes with the patient&apos;s doctor.
      </p>
    </div>
  );
}
