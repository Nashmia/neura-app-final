"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Loader2, NotebookPen, Send } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, redirectToLogin } from "@/lib/utils";

type MoodTag = "Calm" | "Anxious" | "Confused" | "Happy" | "Tired";
type JournalEntry = { id: string; text: string; moodTag?: MoodTag; createdAt: string };

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
      if (!(await post({ text }))) return;
      setText(""); // only cleared once the note is safely saved
      setNoteStatus({ ok: true, text: "Note saved to the timeline." });
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
                        placeholder="How did today go? Any changes worth remembering..."
                        rows={5}
                        className="w-full px-4 py-3 text-base rounded-[12px] border border-input bg-white text-ink transition hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25"
                      />
                      <Button disabled={saving || !text.trim()} className="w-full">
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                        {saving ? "Saving..." : "Save entry"}
                      </Button>
                      {noteStatus && <p role={noteStatus.ok ? "status" : "alert"} className={cn("text-sm font-medium", noteStatus.ok ? "text-accent-ink" : "text-red-600")}>{noteStatus.text}</p>}
                    </form>
                  </CardContent>
                </Card>
              </div>

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
                                {entry.moodTag && <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary">{entry.moodTag}</span>}
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
          </AppShell>
  );
}
