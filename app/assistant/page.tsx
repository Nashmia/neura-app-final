"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Home, LifeBuoy, Send, ShieldAlert, Sparkles } from "lucide-react";
import { ModelBadge } from "@/components/ml/model-badge";
import { entailment, mlSupported } from "@/lib/ml/client";
import { factCheck, type Segment, type SentenceCheck } from "@/lib/ml/fact-check";
import { VoiceInputButton } from "@/components/voice/voice-input-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { api, redirectToLogin } from "@/lib/utils";

type HistoryTurn = { role: "user" | "model"; text: string };
// Only the knowledge-base articles the reply cites, numbered as in the reply ("[1]").
type Source = { n: number; title: string; source: string };
type Safety = { category: "self_harm" | "harm_to_others" | "medical_emergency" | "none"; injection: boolean; model: string | null };
type FactCheckState = { status: "running" } | { status: "done"; segments: Segment[]; checks: SentenceCheck[] } | { status: "error" };
type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  model?: string;
  ms?: number;
  fallbackReason?: string;
  safety?: Safety;
  factCheck?: FactCheckState;
};
type TopicCount = { id: string; label: string; count: number };

const CRISIS_TEXT: Record<Exclude<Safety["category"], "none">, { title: string; body: string }> = {
  medical_emergency: { title: "If this is happening now, call your local emergency number.", body: "Don't wait for an answer here if someone is hurt, not breathing normally, has chest pain, signs of a stroke, or is missing." },
  self_harm: { title: "You don't have to carry this alone.", body: "If you or someone else is in immediate danger, call your local emergency number now. You can also call a crisis line or talk to your doctor today." },
  harm_to_others: { title: "Safety comes first.", body: "If anyone is in danger, move to a safe place and call your local emergency number. Adult protective or safeguarding services and your doctor can help next." },
};

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
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [showChecks, setShowChecks] = useState<Record<number, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/assistant/topics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTopics(d.topics ?? []))
      .catch(() => undefined);
  }, []);

  /** Fact-checks a reply on this device (DeBERTa NLI in a worker) and stores the result on that message. */
  async function runFactCheck(index: number, reply: string, evidence: string[]) {
    const update = (state: FactCheckState) => setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, factCheck: state } : msg)));
    update({ status: "running" });
    try {
      update({ status: "done", ...(await factCheck(reply, evidence, entailment)) });
    } catch {
      update({ status: "error" });
    }
  }

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
      const data = await api<{ message: string; sources: Source[]; model?: string; generationMs?: number; fallbackReason?: string; evidence?: string[]; safety?: Safety }>("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ history: nextHistory }),
      });
      setHistory((h) => [...h, { role: "model", text: data.message }]);
      const index = messages.length + 1; // after the question added above
      setMessages((m) => [...m, { role: "assistant", text: data.message, sources: data.sources, model: data.model, ms: data.generationMs, fallbackReason: data.fallbackReason, safety: data.safety }]);
      // Not for safety-flagged replies: those are urgent instructions, not claims to check against guidance.
      if (mlSupported() && data.evidence?.length && (!data.safety || data.safety.category === "none")) runFactCheck(index, data.message, data.evidence);
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
                  {topics.length > 0 && (
                    <div className="rounded-2xl border border-border bg-white px-4 py-3">
                      <p className="text-sm font-medium text-ink">What you&apos;ve asked about (last 30 days)</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topics.map((t) => (
                          <span key={t.id} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary">{t.label} · {t.count}</span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">Each question is tagged by meaning (zero-shot, Gemini embeddings); the questions themselves aren&apos;t stored.</p>
                    </div>
                  )}
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
                    {message.safety && message.safety.category !== "none" && (
                      <div role="alert" className="mb-2 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <LifeBuoy className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
                        <div>
                          <p className="font-semibold">{CRISIS_TEXT[message.safety.category].title}</p>
                          <p className="mt-0.5">{CRISIS_TEXT[message.safety.category].body}</p>
                        </div>
                      </div>
                    )}
                    {message.safety?.injection && (
                      <p className="mb-2 flex items-center gap-2 rounded-2xl bg-surface px-4 py-2 text-xs text-slate-600">
                        <ShieldAlert className="size-4 shrink-0 text-primary" aria-hidden />
                        This message looked like it tried to change the assistant&apos;s rules (Llama Prompt Guard); those parts were ignored.
                      </p>
                    )}
                    <div
                      className={`rounded-3xl px-5 py-4 text-base leading-7 whitespace-pre-wrap ${
                        message.role === "user"
                          ? "rounded-br-md bg-navy text-white"
                          : "rounded-bl-md border border-border bg-surface text-slate-800"
                      }`}
                    >
                      {message.factCheck?.status === "done" && showChecks[index] ? <CheckedText segments={message.factCheck.segments} checks={message.factCheck.checks} /> : message.text}
                    </div>
                    {message.factCheck && <FactCheckLine state={message.factCheck} shown={Boolean(showChecks[index])} onToggle={() => setShowChecks((s) => ({ ...s, [index]: !s[index] }))} />}
                    {message.model && (
                      <p className="mt-1.5 pl-2 text-[11px] text-slate-500">
                        Answered by {message.model}
                        {typeof message.ms === "number" ? ` · ${(message.ms / 1000).toFixed(1)}s` : ""}
                        {message.safety?.model ? ` · safety screen: ${message.safety.model}` : ""}
                        {message.fallbackReason && <span className="block text-amber-700">Why not the main model: {message.fallbackReason}</span>}
                      </p>
                    )}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.sources.map((s) => (
                          <a
                            key={s.source}
                            href={`/assistant/sources/${encodeURIComponent(s.source)}`}
                            target="_blank"
                            rel="noopener"
                            title="Open this guidance article in a new tab"
                            className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm underline-offset-2 transition hover:bg-lavender hover:underline"
                          >
                            <BookOpen className="size-3" />
                            [{s.n}] {s.title}
                          </a>
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
                placeholder="Ask, or tap the mic to speak..."
                className="h-14 flex-1 rounded-2xl border border-border bg-surface px-5 text-lg text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60"
              />
              <VoiceInputButton
                disabled={sending}
                onText={(text) => { setError(null); setInput((v) => (v ? `${v} ${text}` : text).slice(0, 2000)); }}
                onError={setError}
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

/** One line under a reply: how many of its statements the sources support, with a toggle to highlight them. */
function FactCheckLine({ state, shown, onToggle }: { state: FactCheckState; shown: boolean; onToggle: () => void }) {
  if (state.status === "error") return null;
  if (state.status === "running")
    return (
      <p className="mt-1.5 pl-2 text-[11px] text-slate-500">
        Fact-checking against the sources… <ModelBadge model="nli" />
      </p>
    );
  const supported = state.checks.filter((c) => c.verdict === "supported").length;
  if (!state.checks.length) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-2 text-[11px] text-slate-500">
      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
      <span>
        Fact-check: {supported} of {state.checks.length} statements found in the sources (the rest are general advice)
      </span>
      <button type="button" onClick={onToggle} aria-pressed={shown} className="font-semibold text-primary underline-offset-2 hover:underline">
        {shown ? "Hide highlights" : "Show highlights"}
      </button>
    </p>
  );
}

const VERDICT_STYLE: Record<SentenceCheck["verdict"], { className: string; title: string }> = {
  supported: { className: "rounded bg-emerald-50 decoration-emerald-500 underline decoration-2 underline-offset-4", title: "Supported by the sources" },
  unverified: { className: "decoration-slate-400 underline decoration-dotted underline-offset-4", title: "Not found in the sources (general advice)" },
};

/** The reply with each checked statement marked: supported, may conflict, or not found in the sources. */
function CheckedText({ segments, checks }: { segments: Segment[]; checks: SentenceCheck[] }) {
  const byIndex = new Map(checks.map((c) => [c.index, c]));
  return (
    <>
      {segments.map((segment, i) => {
        const check = byIndex.get(i);
        if (!check) return <span key={i}>{segment.text}</span>;
        const trimmed = segment.text.trimEnd();
        const style = VERDICT_STYLE[check.verdict];
        return (
          <span key={i}>
            <span className={style.className} title={`${style.title}${check.verdict === "supported" ? ` (${Math.round(check.score * 100)}%)` : ""}`}>{trimmed}</span>
            {segment.text.slice(trimmed.length)}
          </span>
        );
      })}
    </>
  );
}
