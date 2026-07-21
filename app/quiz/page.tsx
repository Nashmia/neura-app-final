"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

type Question = { id: string; question: string; image: string; options: string[] };

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch("/api/quiz/questions").then(async r => { if (r.status === 401) location.href = "/login"; return r.json(); }).then(d => setQuestions(d.questions || [])).finally(()=>setLoading(false)); }, []);
  const question = questions[current];
  const progress = useMemo(() => questions.length ? ((current + 1) / questions.length) * 100 : 0, [current, questions.length]);

  async function finishQuiz() {
    const response = await fetch("/api/quiz/session", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ answers }) });
    const data = await response.json();
    if (response.ok) setResult(data.session);
  }

  if (loading) return <main className="soft-gradient grid min-h-screen place-items-center"><div className="rounded-3xl bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm">Loading quiz...</div></main>;
  if (result) return <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4"><div aria-hidden className="pointer-events-none absolute inset-0 -z-10"><div className="animate-blob absolute left-1/4 top-16 size-80 bg-emerald-400/20 blur-3xl" /><div className="animate-blob anim-delay-3 absolute right-1/4 bottom-16 size-80 bg-teal-400/20 blur-3xl" /></div><motion.div initial={{opacity:0,scale:.92,y:16}} animate={{opacity:1,scale:1,y:0}} transition={{duration:.5,ease:[.22,1,.36,1]}} className="w-full max-w-md"><Card className="rounded-[2rem] border-blue-100 bg-white shadow-2xl shadow-blue-600/10"><CardContent className="p-8 text-center"><motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:.2,type:"spring",stiffness:200,damping:12}}><CheckCircle2 className="mx-auto mb-4 size-16 text-emerald-500"/></motion.div><h1 className="text-3xl font-bold text-slate-950">Quiz Complete</h1><p className="mt-3 text-lg text-slate-600">Score: <strong className="text-gradient text-2xl font-extrabold">{result.score}</strong> out of <strong>{result.total}</strong></p><Button asChild className="mt-6"><Link href="/dashboard">Back to dashboard</Link></Button></CardContent></Card></motion.div></main>;
  if (!question) return <main className="soft-gradient grid min-h-screen place-items-center px-4"><Card><CardContent className="p-8 text-center"><h1 className="text-2xl font-bold">No questions available</h1><Button asChild className="mt-6"><Link href="/dashboard">Dashboard</Link></Button></CardContent></Card></main>;

  const selected = answers[question.id];
  return <main className="soft-gradient relative min-h-screen overflow-hidden px-4 py-6 sm:py-10"><div aria-hidden className="pointer-events-none absolute inset-0 -z-10"><div className="animate-blob absolute -left-24 top-10 size-80 bg-teal-400/12 blur-3xl" /><div className="animate-blob anim-delay-3 absolute -right-20 bottom-10 size-96 bg-emerald-400/12 blur-3xl" /></div><div className="mx-auto max-w-5xl"><header className="mb-6 flex items-center justify-between"><Logo /><Button asChild variant="outline" className="rounded-full bg-white"><Link href="/dashboard"><Home className="mr-2 size-4"/>Dashboard</Link></Button></header><Card className="rounded-[2rem] border-blue-100 bg-white shadow-2xl shadow-blue-600/10"><CardContent className="p-5 sm:p-8 lg:p-10"><div className="mb-8"><div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600"><span>Question {current+1} of {questions.length}</span><span>{Math.round(progress)}%</span></div><div className="h-4 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500" style={{width:`${progress}%`}} /></div></div><div><motion.div key={current} initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.3}} className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"><div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-blue-100 bg-blue-50"><Image src={question.image} alt="Quiz visual prompt" fill className="object-cover" priority /></div><div><p className="mb-3 text-lg font-semibold text-primary">Please choose one answer</p><h1 className="text-balance text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-5xl">{question.question}</h1><div className="mt-8 grid gap-4">{question.options.map(option => <button key={option} type="button" onClick={() => setAnswers(v => ({...v, [question.id]: option}))} className={`flex min-h-20 items-center justify-between rounded-3xl border px-6 py-5 text-left text-xl font-semibold transition sm:text-2xl ${selected===option ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "border-blue-100 bg-blue-50/60 text-slate-800 hover:border-blue-300 hover:bg-blue-50"}`}><span>{option}</span>{selected===option && <CheckCircle2 className="size-7"/>}</button>)}</div></div></motion.div></div><div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button variant="outline" onClick={()=>setCurrent(v=>Math.max(v-1,0))} disabled={current===0} className="h-14 rounded-2xl bg-white px-7 text-base"><ArrowLeft className="mr-2 size-5"/>Previous</Button>{current<questions.length-1?<Button onClick={()=>setCurrent(v=>Math.min(v+1,questions.length-1))} disabled={!selected} className="h-14 rounded-2xl px-7 text-base">Next<ArrowRight className="ml-2 size-5"/></Button>:<Button onClick={finishQuiz} disabled={!selected} className="h-14 rounded-2xl px-7 text-base">Finish Quiz</Button>}</div></CardContent></Card></div></main>
}
