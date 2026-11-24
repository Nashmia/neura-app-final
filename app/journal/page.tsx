"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HeartHandshake, Home, Layers, Loader2, NotebookPen, Search, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ModelBadge } from "@/components/ml/model-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CaregiverStrain, MoodAnomaly, Theme } from "@/lib/journal-insights";
import { classifyEmotion, mlSupported, warmModel } from "@/lib/ml/client";
import type { Emotion, MoodSuggestion } from "@/lib/mood-suggest";
import { cn, redirectToLogin } from "@/lib/utils";

type MoodTag = "Calm" | "Anxious" | "Confused" | "Happy" | "Tired";
type JournalEntry = { id: string; text: string; moodTag?: MoodTag; emotion?: Emotion; createdAt: string };
type SearchResult = { entry: JournalEntry; score: number };
type Insights = {
  themes: Theme[] | null;
  themesError?: string;
  minThemeNotes: number;
  strain: CaregiverStrain | null;
  moodAnomaly: MoodAnomaly | null;
  emotions: { label: string; count: number }[];
};

const EMOTION_EMOJI: Record<string, string> = { joy: "😊", neutral: "😐", sadness: "😢", fear: "😨", anger: "😠", disgust: "😖", surprise: "😮" };

const moods: { tag: MoodTag; emoji: string }[] = [
  { tag: "Happy", emoji: "😊" },
  { tag: "Calm", emoji: "🙂" },
  { tag: "Tired", emoji: "😴" },
  { tag: "Confused", emoji: "😕" },
  { tag: "Anxious", emoji: "😟" },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodTag | null>(null);
  const [moodSaving, setMoodSaving] = useState<MoodTag | null>(null);
  const [moodStatus, setMoodStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [noteStatus, setNoteStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [listError, setListError] = useState("");
  const [suggestion, setSuggestion] = useState<MoodSuggestion | null>(null);
  const [useSuggestion, setUseSuggestion] = useState(false);
  // The emotion model's reading of the note, and the exact text it read (so a stale reading is never saved).
  const [emotion, setEmotion] = useState<{ text: string; top: Emotion } | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);

  // Suggest a mood from the note as the caregiver types: keywords + VADER straight away, then the
  // on-device emotion model (DistilRoBERTa, in a background worker) once it has read the note.
  // The analysers load only once there is a note to read, and nothing is attached unless they accept.
  useEffect(() => {
    if (!text.trim()) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { suggestMood } = await import("@/lib/mood-suggest");
      if (cancelled) return;
      setSuggestion(suggestMood(text, emotion?.text === text ? emotion.top : null));
      if (!mlSupported() || text.trim().split(/\s+/).length < 3 || emotion?.text === text) return;
      try {
        const [top] = await classifyEmotion(text);
        if (cancelled || !top) return;
        setEmotion({ text, top });
        setSuggestion(suggestMood(text, top));
      } catch {
        // Model unavailable: the keyword + VADER suggestion stays.
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);
  // A different suggestion has to be accepted again.
  useEffect(() => setUseSuggestion(false), [suggestion?.tag]);

  async function loadInsights() {
    try {
      const r = await fetch("/api/journal/insights");
      if (r.ok) setInsights(await r.json());
    } catch {
      // Insights are extra; the journal works without them.
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchError("");
    try {
      const r = await fetch(`/api/journal/search?q=${encodeURIComponent(q)}`);
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Search failed.");
      setResults(d.results);
    } catch (err) {
      setResults(null);
      setSearchError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server.");
    } finally {
      setSearching(false);
    }
  }

  async function load() {
    try {
      const r = await fetch("/api/journal");
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEntries(d.entries || []);
      setListError("");
    } catch {
      setListError("Couldn't load the timeline. Refresh the page to try again.");
    } finally {
      setLoading(false);
    }
  }

  async function post(body: object) {
    const r = await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) {
      redirectToLogin();
      return false;
    }
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || "It wasn't saved.");
    }
    return true;
  }
  useEffect(() => {
    load();
    loadInsights();
  }, []);

  // One tap records one mood entry; further taps are ignored until it has saved.
  async function logMood(tag: MoodTag) {
    if (moodSaving) return;
    setMoodSaving(tag);
    setMoodStatus(null);
    try {
      if (!(await post({ text: "", moodTag: tag }))) return;
      setSelectedMood(tag);
      setMoodStatus({ ok: true, text: `${tag} recorded at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` });
      await load();
    } catch (err) {
      setMoodStatus({ ok: false, text: `${err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server."} Tap the mood again to retry.` });
    } finally {
      setMoodSaving(null);
    }
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    setNoteStatus(null);
    try {
      const moodTag = useSuggestion && suggestion ? suggestion.tag : undefined;
      const noteEmotion = emotion?.text === text ? emotion.top : undefined;
      if (!(await post({ text, moodTag, emotion: noteEmotion }))) return;
      setText(""); // only cleared once the note is safely saved
      setUseSuggestion(false);
      setEmotion(null);
      loadInsights();
      setNoteStatus({ ok: true, text: moodTag ? `Note saved to the timeline as ${moodTag}.` : "Note saved to the timeline." });
      await load();
    } catch (err) {
      setNoteStatus({ ok: false, text: `${err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server."} Your note is still here.` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell eyebrow="Mood &amp; notes" title={<>Care <em>journal</em></>} description={"Log today's mood and keep caregiver notes over time."} actions={<Button asChild variant="outline"><Link href="/dashboard"><Home className="mr-1 size-4"/>Dashboard</Link></Button>}>
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-[1.35rem] text-ink">Today's check-in</h2>
                    <p className="mt-2 text-sm text-slate-500">Tap the mood that best describes the patient right now. Each tap adds an entry to the timeline.</p>
                    <div className="mt-5 grid grid-cols-5 gap-2">
                      {moods.map((m) => (
                        <button
                          key={m.tag}
                          type="button"
                          onClick={() => logMood(m.tag)}
                          disabled={Boolean(moodSaving)}
                          aria-pressed={selectedMood === m.tag}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold text-slate-600 transition hover:bg-blue-100",
                            selectedMood === m.tag && "border-blue-400 bg-blue-100 text-blue-800"
                          )}
                        >
                          <span className="text-2xl" aria-hidden>{moodSaving === m.tag ? <Loader2 className="mx-auto size-6 animate-spin" /> : m.emoji}</span>
                          {m.tag}
                        </button>
                      ))}
                    </div>
                    {moodStatus && <p role={moodStatus.ok ? "status" : "alert"} className={cn("mt-3 text-sm font-medium", moodStatus.ok ? "text-accent-ink" : "text-red-600")}>{moodStatus.text}</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-[1.35rem] text-ink"><label htmlFor="journal-note">Add a note</label></h2>
                    <form onSubmit={addEntry} className="mt-4 space-y-3">
                      <textarea
                        id="journal-note"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => mlSupported() && warmModel("emotion")}
                        placeholder="How did today go? Any changes worth remembering..."
                        rows={5}
                        className="w-full px-4 py-3 text-base rounded-[12px] border border-input bg-white text-ink transition hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25"
                      />
                      {suggestion && (() => {
                        const mood = moods.find((m) => m.tag === suggestion.tag)!;
                        return (
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                            <p className="min-w-0 flex-1 text-sm text-slate-600">
                              Suggested mood: <span className="font-semibold text-ink">{mood.emoji} {suggestion.tag}</span>
                              <span className="block text-xs text-slate-500">Because the note {suggestion.reason}.</span>
                              {emotion?.text === text && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  Emotion model: {EMOTION_EMOJI[emotion.top.label] ?? ""} {emotion.top.label} ({Math.round(emotion.top.score * 100)}%)
                                </span>
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => setUseSuggestion((v) => !v)}
                              aria-pressed={useSuggestion}
                              className={cn(
                                "shrink-0 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-blue-100",
                                useSuggestion && "border-blue-400 bg-blue-100 text-blue-800"
                              )}
                            >
                              {useSuggestion ? "Added ✓" : "Add to note"}
                            </button>
                          </div>
                        );
                      })()}
                      <ModelBadge model="emotion" />
                      <Button disabled={saving || !text.trim()} className="w-full">
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                        {saving ? "Saving..." : "Save entry"}
                      </Button>
                      {noteStatus && <p role={noteStatus.ok ? "status" : "alert"} className={cn("text-sm font-medium", noteStatus.ok ? "text-accent-ink" : "text-red-600")}>{noteStatus.text}</p>}
                    </form>
                  </CardContent>
                </Card>

                {insights && <InsightsCard insights={insights} />}
              </div>

              <div className="min-w-0 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-[1.35rem] text-ink"><label htmlFor="journal-search">Search by meaning</label></h2>
                  <p className="mt-1 text-sm text-slate-500">Finds notes about the same thing even in different words, e.g. &ldquo;trouble sleeping&rdquo; also finds &ldquo;up wandering at 3am&rdquo;.</p>
                  <form onSubmit={search} className="mt-4 flex gap-2">
                    <input
                      id="journal-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      maxLength={300}
                      placeholder="e.g. didn't want to eat"
                      className="h-12 min-w-0 flex-1 rounded-[12px] border border-input bg-white px-4 text-base text-ink transition hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25"
                    />
                    <Button disabled={searching || !query.trim()} className="h-12 shrink-0" aria-label="Search notes">
                      {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    </Button>
                  </form>
                  {searchError && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{searchError}</p>}
                  {results && (
                    <div className="mt-4 space-y-2" role="status">
                      {results.length === 0 ? (
                        <p className="text-sm text-slate-500">No notes about that yet.</p>
                      ) : (
                        results.map(({ entry, score }) => (
                          <div key={entry.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span>{new Date(entry.createdAt).toLocaleString()}</span>
                              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-semibold text-primary">{Math.round(score * 100)}% match</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-800">{entry.text}</p>
                          </div>
                        ))
                      )}
                      <button type="button" onClick={() => setResults(null)} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">Clear results</button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-[1.6rem] text-ink">Timeline</h2>
                  {listError && <p role="alert" className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{listError}</p>}
                  {loading ? (
                    <p className="mt-6 text-slate-500">Loading...</p>
                  ) : entries.length === 0 ? (
                    <p className="mt-6 text-slate-500">No journal entries yet. Record a mood or add a note to start the timeline.</p>
                  ) : (
                    <div className="mt-6 grid gap-4">
                      {entries.map((entry, index) => {
                        const mood = moods.find((m) => m.tag === entry.moodTag);
                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.05 }}
                            className="flex items-start gap-4 rounded-3xl border border-border bg-surface p-5"
                          >
                            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl">{mood?.emoji ?? <NotebookPen className="size-5 text-primary" />}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                                <span className="flex shrink-0 gap-1">
                                  {entry.emotion && <span title="Read by the on-device emotion model" className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{EMOTION_EMOJI[entry.emotion.label] ?? ""} {entry.emotion.label}</span>}
                                  {entry.moodTag && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary">{entry.moodTag}</span>}
                                </span>
                              </div>
                              {entry.text && <p className="mt-1 whitespace-pre-wrap text-slate-800">{entry.text}</p>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </AppShell>
  );
}

/** Recurring themes (k-means on note embeddings), caregiver strain (VADER) and mood anomaly (z-score). */
function InsightsCard({ insights }: { insights: Insights }) {
  const { themes, strain, moodAnomaly, emotions, minThemeNotes, themesError } = insights;
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-[1.35rem] text-ink">Insights</h2>
          <p className="text-sm text-slate-500">Patterns in the journal. Tracking aids, not assessments.</p>
        </div>

        <section>
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink"><Layers className="size-4 text-primary" aria-hidden />Recurring themes</h3>
          {themes ? (
            <ul className="mt-3 space-y-3">
              {themes.map((t) => (
                <li key={t.label}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{t.label}</span>
                    <span className="shrink-0 text-slate-500">{t.count} note{t.count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-periwinkle" style={{ width: `${t.share}%` }} /></div>
                  <p className="mt-1 truncate text-xs text-slate-500" title={t.example}>e.g. &ldquo;{t.example}&rdquo;</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{themesError ?? `Themes appear once there are ${minThemeNotes} written notes.`}</p>
          )}
        </section>

        {moodAnomaly && (
          <section>
            <h3 className="text-base font-semibold text-ink">Mood this week</h3>
            <p className={cn("mt-2 rounded-2xl px-4 py-3 text-sm", moodAnomaly.unusual ? "bg-amber-50 text-amber-900" : "bg-surface text-slate-600")}>
              {moodAnomaly.unusual
                ? `Moods logged this week are unusually ${moodAnomaly.direction} than in earlier weeks (${moodAnomaly.thisWeek} vs a usual ${moodAnomaly.usual} on a 1–5 scale). Worth keeping an eye on.`
                : `Moods this week are in the usual range (${moodAnomaly.thisWeek} vs a usual ${moodAnomaly.usual} on a 1–5 scale).`}
            </p>
          </section>
        )}

        {strain && (
          <section>
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink"><HeartHandshake className="size-4 text-primary" aria-hidden />How the notes read</h3>
            <p className="mt-1 text-xs text-slate-500">Weekly tone of written notes (VADER sentiment): teal is lighter, amber is heavier.</p>
            <div className="mt-3 flex h-20 items-end gap-1.5" aria-label="Weekly tone of notes, oldest first">
              {strain.weeks.map((w) => (
                <div key={w.week} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week of ${w.week}: tone ${w.score} from ${w.notes} note${w.notes === 1 ? "" : "s"}`}>
                  <div className="flex w-full flex-1 items-end">
                    <div className={cn("w-full rounded-t-md", w.score < 0 ? "bg-amber-300" : "bg-teal-300")} style={{ height: `${Math.max(10, Math.abs(w.score) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">{w.week}</span>
                </div>
              ))}
            </div>
            <p className={cn("mt-3 rounded-2xl px-4 py-3 text-sm", strain.elevated ? "bg-amber-50 text-amber-900" : "bg-surface text-slate-600")}>
              {strain.elevated
                ? "Your recent notes describe a lot of hard days. Caring is demanding: consider asking family to share a shift, contacting a carers' support group, or talking to your own doctor. You don't have to manage alone."
                : "The tone of recent notes is within the usual range."}
            </p>
          </section>
        )}

        {emotions.length > 0 && (
          <section>
            <h3 className="text-base font-semibold text-ink">Emotions in notes</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {emotions.map((e) => (
                <span key={e.label} className="rounded-full bg-surface px-3 py-1 text-xs text-slate-600">{EMOTION_EMOJI[e.label] ?? ""} {e.label} · {e.count}</span>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
