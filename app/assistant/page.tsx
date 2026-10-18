"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Home, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { api, redirectToLogin } from "@/lib/utils";

type HistoryTurn = { role: "user" | "model"; text: string };
// Only the knowledge-base articles the reply cites, numbered as in the reply ("[1]").
type Source = { n: number; title: string; source: string };
type ChatMessage = { role: "user" | "assistant"; text: string; sources?: Source[] };

const starterPrompts = [
  "How should I respond when they ask the same question over and over?",
  "How has mood been trending this week?",
  "Any tips for bath time resistance?",
  "What should I bring to the next doctor's appointment?",
];

export default function AssistantPage() {
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    const nextHistory: HistoryTurn[] = [...history, { role: "user", text: question }];
    setMessages((m) => [...m, { role: "user", text: question }]);
    setHistory(nextHistory);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const data = await api<{ message: string; sources: Source[] }>("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ history: nextHistory }),
      });
      setHistory((h) => [...h, { role: "model", text: data.message }]);
      setMessages((m) => [...m, { role: "assistant", text: data.message, sources: data.sources }]);
    } catch (err) {
      if (err instanceof Error && err.message === "Please log in first.") {
        redirectToLogin();
        return;
      }
      if (err instanceof Error && err.message === "Complete onboarding first.") {
        setNeedsOnboarding(true);
        return;
      }
      // Take the unanswered question back out (so the next request doesn't carry two questions in a row) and return it to the input for a retry.
      setHistory(history);
      setMessages((m) => m.slice(0, -1));
      setInput(question);
      const message = err instanceof Error && err.message !== "Failed to fetch" && err.message !== "Request failed" ? err.message : "The assistant couldn't be reached.";
      setError(`${message} Your question is back in the box below; press send to try again.`);
    } finally {
      setSending(false);
    }
  }

  if (needsOnboarding) {
    return (
      <main className="soft-gradient grid min-h-screen place-items-center px-4">
        <Card className="max-w-md rounded-[1.75rem]">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Complete onboarding first</h1>
            <p className="mt-3 text-slate-600">Add a patient profile to start using the care assistant.</p>
            <Button asChild className="mt-6">
              <Link href="/onboarding">Start onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="soft-gradient relative min-h-screen overflow-hidden px-4 py-6 sm:py-10">
      <div className="mx-auto flex h-[calc(100dvh-3rem)] max-w-3xl flex-col sm:h-[calc(100dvh-5rem)]">
        <header className="mb-6 flex items-center justify-between">
          <Logo />
          <Button asChild variant="outline" className="rounded-full bg-white">
            <Link href="/dashboard">
              <Home className="mr-2 size-4" />
              Dashboard
            </Link>
          </Button>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)]">
          <div className="on-dark shrink-0 bg-navy px-5 py-6 text-white sm:px-8">
            <h1 className="text-[1.65rem] text-white">Care <em>Assistant</em></h1>
            <p className="mt-1.5 flex items-center gap-2 text-[13px] text-white/75">
              <Sparkles className="size-4 shrink-0 text-blue-300" />
              Grounded in caregiving guidance and this patient&apos;s recent data
            </p>
          </div>
          <CardContent className="flex min-h-0 flex-1 flex-col p-5 sm:p-8">

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="grid gap-2">
                  <p className="rounded-2xl bg-surface px-4 py-3 text-sm leading-6 text-slate-600">Ask about everyday caregiving or this patient&apos;s recorded medications, moods, notes, appointments and check-ins. Numbered sources show which guidance an answer used. The assistant can be wrong and is not a substitute for professional medical advice; for medical decisions, contact the patient&apos;s doctor.</p>
                  <p className="text-sm text-slate-500">Try asking:</p>
                  {starterPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-blue-100"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-3xl px-5 py-4 text-base leading-7 whitespace-pre-wrap ${
                        message.role === "user"
                          ? "rounded-br-md bg-navy text-white"
                          : "rounded-bl-md border border-border bg-surface text-slate-800"
                      }`}
                    >
                      {message.text}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.sources.map((s) => (
                          <span key={s.source} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                            <BookOpen className="size-3" />
                            [{s.n}] {s.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-3xl rounded-bl-md border border-border bg-surface px-5 py-4 text-slate-500">Thinking...</div>
                </div>
              )}
              {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-red-700">{error}</div>}
              <div ref={bottomRef} />
            </div>

            <div className="mt-6 flex shrink-0 items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send(input);
                }}
                disabled={sending}
                maxLength={2000}
                aria-label="Your question for the care assistant"
                placeholder="Ask about care, symptoms, or this patient's recent activity..."
                className="h-14 flex-1 rounded-2xl border border-border bg-surface px-5 text-lg text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60"
              />
              <Button onClick={() => send(input)} disabled={sending || !input.trim()} size="icon" aria-label="Send question" className="size-14 shrink-0 rounded-2xl">
                <Send className="size-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
