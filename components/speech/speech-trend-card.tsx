"use client";

import { Mic } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { SpeechMarkersPanel } from "@/components/speech/speech-markers-panel";
import type { SpeechMarkers } from "@/lib/speech-markers";

export type SpeechDashboardData = {
  latest: SpeechMarkers;
  latestDate: string;
  baseline: SpeechMarkers | null;
  baselineSessions: number;
  trend: { day: string; pace: number | null; pauses: number | null }[];
};

/** Dashboard card: speech markers from the latest voice check-in, against the patient's own earlier ones. */
export function SpeechTrendCard({ speech }: { speech: SpeechDashboardData }) {
  const date = new Date(speech.latestDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.35rem] text-ink">Speech Markers</h2>
            <p className="text-sm text-slate-500">
              From spoken check-in answers · latest {date}
              {speech.baselineSessions ? ` · compared with the previous ${speech.baselineSessions} voice check-in${speech.baselineSessions === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-full border border-periwinkle bg-white text-navy"><Mic className="size-5" /></div>
        </div>
        <SpeechMarkersPanel speech={speech.latest} baseline={speech.baseline} />
        {speech.trend.length > 1 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-ink">Pace and pauses over time</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speech.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="pace" axisLine={false} tickLine={false} width={36} />
                  <YAxis yAxisId="pauses" orientation="right" axisLine={false} tickLine={false} width={30} />
                  <Tooltip />
                  <Line yAxisId="pace" type="monotone" dataKey="pace" name="Words/min" stroke="#3442a8" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                  <Line yAxisId="pauses" type="monotone" dataKey="pauses" name="Pauses/min" stroke="#d97706" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {!speech.baselineSessions && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-slate-600">
            This is the first voice check-in. After a few more, changes against the patient&apos;s own usual speech will show here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
