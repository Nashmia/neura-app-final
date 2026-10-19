import type { Metadata } from "next";
import { CalendarCheck, ClipboardList, NotebookPen, Pill, Brain, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "@/components/doctor/print-button";
import { getCollections } from "@/lib/db";
import { loadDoctorView } from "@/lib/doctor-share";
import { formatCalendarDate, formatTimestamp } from "@/lib/assistant-context";

// Read-only clinical summary opened from a caregiver's doctor share link. No account needed;
// never indexed or cached, since it contains health information.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clinical summary | Neura", robots: { index: false, follow: false } };

const MOOD_ORDER = ["Happy", "Calm", "Tired", "Confused", "Anxious"] as const;

export default async function DoctorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const view = await loadDoctorView(await getCollections(), decodeURIComponent(code));

  if (!view.ok) {
    const text = {
      invalid: "This link isn't valid. Please check you copied the whole link.",
      expired: "This link has expired. Doctor links last 7 days; ask the caregiver for a new one.",
      revoked: "The caregiver has turned this link off. Ask them for a new one if you still need access.",
    }[view.reason];
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Logo className="mx-auto mb-6 justify-center" />
            <h1 className="text-[1.6rem] text-ink">Summary unavailable</h1>
            <p className="mt-3 text-slate-600">{text}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { patient, medications, sessions, appointments, journal, caregivers, expiresAt } = view;
  const recentSessions = sessions.slice(-10);
  const pct = (s: { score: number; total: number }) => Math.round((s.score / s.total) * 100);
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentMoods = journal.filter((j) => j.moodTag && Date.parse(j.createdAt) >= twoWeeksAgo);
  const moodCounts = MOOD_ORDER.map((m) => ({ mood: m, count: recentMoods.filter((j) => j.moodTag === m).length })).filter((m) => m.count);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a) => a.status === "Upcoming" && a.date >= today);
  const past = appointments.filter((a) => a.status === "Upcoming" && a.date < today).slice(-5).reverse();
  const notes = journal.filter((j) => j.text).slice(0, 12);

  return (
    <main className="min-h-screen bg-background px-4 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <PrintButton />
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-white px-5 py-4 text-sm text-slate-600">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-ink" />
          <p>
            Read-only clinical summary shared by {caregivers.length ? caregivers.join(" and ") : "the caregiver"} through Neura. Records are entered by the caregiver at home.
            This link stops working on <strong className="text-ink">{formatTimestamp(new Date(expiresAt).toISOString())}</strong> or when the caregiver revokes it.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">Patient</p>
            <h1 className="mt-1 text-[2.2rem] leading-tight text-ink">{patient.name}</h1>
            <p className="mt-1 text-slate-600">Age {patient.age} · {patient.gender} · {patient.dementiaStage} dementia</p>
            {patient.notes && <p className="mt-4 rounded-2xl bg-surface p-4 text-[15px] leading-7 text-slate-700"><span className="font-semibold text-ink">Caregiver notes: </span>{patient.notes}</p>}
            {patient.contacts.length > 0 && (
              <p className="mt-3 text-sm text-slate-600"><span className="font-semibold text-ink">Family &amp; friends: </span>{patient.contacts.map((c) => `${c.name} (${c.relationship || c.type})`).join(", ")}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Section icon={<Pill className="size-5" />} title="Medications" subtitle="Today's status as recorded by the caregiver">
            {medications.length === 0 ? <Empty>No medications recorded.</Empty> : (
              <ul className="divide-y divide-border">
                {medications.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span><span className="font-medium text-ink">{m.name}</span> <span className="text-slate-500">{m.dosage} · {m.time}</span></span>
                    <span className={m.status === "Taken" ? "rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold text-navy" : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"}>{m.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={<CalendarCheck className="size-5" />} title="Appointments">
            {upcoming.length === 0 && past.length === 0 ? <Empty>No appointments recorded.</Empty> : (
              <div className="space-y-3 text-sm">
                {upcoming.map((a) => <ApptRow key={a.id} a={a} />)}
                {past.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recent</p>}
                {past.map((a) => <ApptRow key={a.id} a={a} muted />)}
              </div>
            )}
          </Section>
        </div>

        <Section className="mt-6" icon={<Brain className="size-5" />} title="Cognitive check-ins" subtitle="Short supervised conversations scored by Neura. A tracking aid, not a diagnostic test.">
          {recentSessions.length === 0 ? <Empty>No check-ins completed yet.</Empty> : (
            <>
              <Sparkline values={recentSessions.map(pct)} />
              <ul className="mt-4 divide-y divide-border text-sm">
                {[...recentSessions].reverse().map((s) => (
                  <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[150px_70px_1fr]">
                    <span className="text-slate-500">{formatTimestamp(s.createdAt)}</span>
                    <span className="font-semibold text-ink">{s.score}/{s.total}</span>
                    <span className="text-slate-600">{s.summary}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
          <Section icon={<ClipboardList className="size-5" />} title="Mood, last 14 days">
            {moodCounts.length === 0 ? <Empty>No moods recorded.</Empty> : (
              <ul className="space-y-2 text-sm">
                {moodCounts.map((m) => (
                  <li key={m.mood} className="flex items-center gap-3">
                    <span className="w-20 text-slate-600">{m.mood}</span>
                    <span className="h-2.5 rounded-full bg-periwinkle" style={{ width: `${(m.count / recentMoods.length) * 100}%`, minWidth: 8 }} />
                    <span className="text-slate-500">{m.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={<NotebookPen className="size-5" />} title="Caregiver observations" subtitle="Most recent journal notes">
            {notes.length === 0 ? <Empty>No notes recorded.</Empty> : (
              <ul className="space-y-3 text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-surface p-3">
                    <p className="text-xs text-slate-500">{formatTimestamp(n.createdAt)}{n.moodTag ? ` · ${n.moodTag}` : ""}</p>
                    <p className="mt-1 leading-6 text-slate-800">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <p className="mt-8 pb-8 text-center text-xs text-slate-500">Neura supports caregiving. It is not a medical device, and this summary is not a diagnosis.</p>
      </div>
    </main>
  );
}

function Section({ icon, title, subtitle, children, className }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`break-inside-avoid ${className ?? ""}`}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-periwinkle bg-white text-navy">{icon}</span>
          <div>
            <h2 className="text-[1.3rem] text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function ApptRow({ a, muted }: { a: { title: string; type: string; date: string; time: string; location?: string }; muted?: boolean }) {
  return (
    <div className={muted ? "text-slate-500" : ""}>
      <p className={muted ? "" : "font-medium text-ink"}>{a.title} <span className="text-xs text-slate-500">({a.type})</span></p>
      <p className="text-slate-500">{formatCalendarDate(a.date)} · {a.time}{a.location ? ` · ${a.location}` : ""}</p>
    </div>
  );
}

/** Check-in scores (%) over time, oldest to newest. */
function Sparkline({ values }: { values: number[] }) {
  const w = 600, h = 120, pad = 14;
  const x = (i: number) => pad + (values.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (values.length - 1));
  const y = (v: number) => h - pad - (v / 100) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" role="img" aria-label={`Check-in scores over time: ${values.join("%, ")}%`}>
      {[0, 50, 100].map((v) => <line key={v} x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="#e4e6ee" />)}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="#3442a8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4.5" fill="#3442a8" />)}
    </svg>
  );
}
