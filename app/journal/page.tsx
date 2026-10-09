"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Loader2, NotebookPen, Send } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

  async function load() {
    const r = await fetch("/api/journal");
    if (r.status === 401) return (location.href = "/login");
    const d = await r.json();
    setEntries(d.entries || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function logMood(tag: MoodTag) {
    setSelectedMood(tag);
    await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "", moodTag: tag }) });
    await load();
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    setText("");
    await load();
    setSaving(false);
  }

  return (
    <main className="dashboard-shell min-h-screen">
      <div className="flex">
        <AppSidebar />
        <section className="w-full lg:pl-72">
          <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/75 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div>
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Care Journal</h1>
                <p className="hidden text-sm text-slate-500 sm:block">Log today's mood and keep caregiver notes over time.</p>
              </div>
              <Button asChild variant="outline" className="rounded-full bg-white">
                <Link href="/dashboard">
                  <Home className="mr-2 size-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="space-y-6">
                <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-slate-950">Today's check-in</h2>
                    <p className="mt-2 text-sm text-slate-500">Tap the mood that best describes the patient right now.</p>
                    <div className="mt-5 grid grid-cols-5 gap-2">
                      {moods.map((m) => (
                        <button
                          key={m.tag}
                          onClick={() => logMood(m.tag)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-2xl border border-blue-100 bg-blue-50/50 py-3 text-xs font-semibold text-slate-600 transition hover:bg-blue-100",
                            selectedMood === m.tag && "border-blue-400 bg-blue-100 text-blue-800"
                          )}
                        >
                          <span className="text-2xl">{m.emoji}</span>
                          {m.tag}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-slate-950">Add a note</h2>
                    <form onSubmit={addEntry} className="mt-4 space-y-3">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="How did today go? Any changes worth remembering..."
                        rows={5}
                        className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <Button disabled={saving || !text.trim()} className="w-full">
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                        Save entry
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-slate-950">Timeline</h2>
                  {loading ? (
                    <p className="mt-6 text-slate-500">Loading...</p>
                  ) : entries.length === 0 ? (
                    <p className="mt-6 text-slate-500">No journal entries yet.</p>
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
                            className="flex items-start gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-5"
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
          </div>
        </section>
      </div>
    </main>
  );
}
