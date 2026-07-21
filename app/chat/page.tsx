"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Home, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { api } from "@/lib/utils";

type HistoryTurn = { role: "user" | "model"; text: string };
type ChatMessage = { role: "user" | "assistant"; text: string };
type QuizTurn =
  | { type: "question"; message: string; questionNumber: number; total: number }
  | { type: "complete"; message: string; score: number; total: number; summary: string };

export default function ChatPage() {
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ score: number; total: number; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendTurn(nextHistory: HistoryTurn[]) {
    setSending(true);
    setError(null);
    try {
      const data = await api<{ turn: QuizTurn }>("/api/chat/quiz", {
        method: "POST",
        body: JSON.stringify({ history: nextHistory }),
      });
      const { turn } = data;
      setHistory([...nextHistory, { role: "model", text: JSON.stringify(turn) }]);
      setMessages((m) => [...m, { role: "assistant", text: turn.message }]);
      if (turn.type === "question") {
        setProgress({ current: turn.questionNumber, total: turn.total });
      } else {
        setProgress({ current: turn.total, total: turn.total });
        setResult({ score: turn.score, total: turn.total, summary: turn.summary });
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Please log in first.") {
        location.href = "/login";
        return;
      }
      if (err instanceof Error && err.message === "Complete onboarding first.") {
        setNeedsOnboarding(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sendTurn([]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function submitAnswer() {
    const answer = input.trim();
    if (!answer || sending || result) return;
    setMessages((m) => [...m, { role: "user", text: answer }]);
    setInput("");
    sendTurn([...history, { role: "user", text: answer }]);
  }

  const progressPct = progress.total ? (progress.current / progress.total) * 100 : 0;

  if (needsOnboarding) {
    return (
      <main className="soft-gradient grid min-h-screen place-items-center px-4">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Complete onboarding first</h1>
            <p className="mt-3 text-slate-600">Add a patient profile to start the cognitive check-in.</p>
            <Button asChild className="mt-6">
              <Link href="/onboarding">Start onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (result) {
    return (
      <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute left-1/4 top-16 size-80 bg-emerald-400/20 blur-3xl" />
          <div className="animate-blob anim-delay-3 absolute right-1/4 bottom-16 size-80 bg-teal-400/20 blur-3xl" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
          <Card className="rounded-[2rem] border-blue-100 bg-white shadow-2xl shadow-blue-600/10">
            <CardContent className="p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}>
                <CheckCircle2 className="mx-auto mb-4 size-16 text-emerald-500" />
              </motion.div>
              <h1 className="text-3xl font-bold text-slate-950">Check-in Complete</h1>
              <p className="mt-3 text-lg text-slate-600">
                Score: <strong className="text-gradient text-2xl font-extrabold">{result.score}</strong> out of <strong>{result.total}</strong>
              </p>
              <p className="mt-4 rounded-2xl bg-blue-50/70 p-4 text-left text-sm leading-6 text-slate-600">{result.summary}</p>
              <Button asChild className="mt-6">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="soft-gradient relative min-h-screen overflow-hidden px-4 py-6 sm:py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -left-24 top-10 size-80 bg-teal-400/12 blur-3xl" />
        <div className="animate-blob anim-delay-3 absolute -right-20 bottom-10 size-96 bg-emerald-400/12 blur-3xl" />
      </div>
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col sm:h-[calc(100vh-5rem)]">
        <header className="mb-6 flex items-center justify-between">
          <Logo />
          <Button asChild variant="outline" className="rounded-full bg-white">
            <Link href="/dashboard">
              <Home className="mr-2 size-4" />
              Dashboard
            </Link>
          </Button>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col rounded-[2rem] border-blue-100 bg-white shadow-2xl shadow-blue-600/10">
          <CardContent className="flex min-h-0 flex-1 flex-col p-5 sm:p-8">
            <div className="mb-6 shrink-0">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  {progress.total ? `Question ${Math.min(progress.current, progress.total)} of ${progress.total}` : "Starting check-in..."}
                </span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-blue-50">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-5 py-4 text-lg leading-7 ${
                      message.role === "user"
                        ? "rounded-br-md bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "rounded-bl-md border border-blue-100 bg-blue-50/60 text-slate-800"
                    }`}
                  >
                    {message.text}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-3xl rounded-bl-md border border-blue-100 bg-blue-50/60 px-5 py-4 text-slate-500">Thinking...</div>
                </div>
              )}
              {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-red-700">{error}</div>}
              <div ref={bottomRef} />
            </div>

            <div className="mt-6 flex shrink-0 items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAnswer();
                }}
                disabled={sending}
                placeholder="Type your answer..."
                className="h-14 flex-1 rounded-2xl border border-blue-100 bg-blue-50/40 px-5 text-lg text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60"
              />
              <Button onClick={submitAnswer} disabled={sending || !input.trim()} size="icon" className="size-14 shrink-0 rounded-2xl">
                <Send className="size-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
