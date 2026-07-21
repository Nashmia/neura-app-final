"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Home, Loader2, Pill, Plus } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Medication = { id: string; name: string; dosage: string; time: string; status: "Taken" | "Pending" };

export default function MedicationsPage() {
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", dosage: "", time: "" });

  async function load() { const r = await fetch("/api/medications"); if (r.status === 401) location.href = "/login"; const d = await r.json(); setItems(d.medications || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function addMedication(e: React.FormEvent) { e.preventDefault(); setSaving(true); const r = await fetch("/api/medications", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) }); if (r.ok) { setForm({ name:"", dosage:"", time:"" }); await load(); } setSaving(false); }
  async function toggle(item: Medication) { const next = item.status === "Taken" ? "Pending" : "Taken"; await fetch("/api/medications", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:item.id, status: next }) }); setItems(v => v.map(m => m.id === item.id ? {...m, status: next} : m)); }

  return <main className="dashboard-shell min-h-screen"><div className="flex"><AppSidebar/><section className="w-full lg:pl-72"><header className="sticky top-0 z-40 border-b border-blue-100 bg-white/75 backdrop-blur-xl"><div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8"><div><h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Medication Tracker</h1><p className="hidden text-sm text-slate-500 sm:block">Add, update, and review today’s medication status.</p></div><Button asChild variant="outline" className="rounded-full bg-white"><Link href="/dashboard"><Home className="mr-2 size-4"/>Dashboard</Link></Button></div></header><div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div className="grid gap-6 lg:grid-cols-[380px_1fr]"><Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm"><CardContent className="p-6"><div className="mb-6"><h2 className="text-2xl font-bold text-slate-950">Add Medication</h2><p className="mt-2 text-sm text-slate-500">New medicines are saved to the backend JSON data store.</p></div><form onSubmit={addMedication} className="space-y-4"><div className="space-y-2"><Label>Medicine name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Donepezil" required /></div><div className="space-y-2"><Label>Dosage</Label><Input value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} placeholder="5mg" required /></div><div className="space-y-2"><Label>Time</Label><Input value={form.time} onChange={e=>setForm({...form,time:e.target.value})} placeholder="08:00 AM" required /></div><Button disabled={saving} className="w-full"><Plus className="mr-2 size-4"/>{saving && <Loader2 className="mr-2 size-4 animate-spin"/>}Add medicine</Button></form></CardContent></Card><Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm"><CardContent className="p-6"><h2 className="text-2xl font-bold text-slate-950">Today’s Schedule</h2>{loading?<p className="mt-6 text-slate-500">Loading...</p>:<div className="mt-6 grid gap-4">{items.map((item,index)=><motion.div key={item.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.35,delay:index*.06}} className="hover-lift flex flex-col gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-white text-primary"><Pill className="size-6"/></div><div><p className="text-lg font-bold text-slate-950">{item.name}</p><p className="flex items-center gap-2 text-sm text-slate-500"><Clock className="size-4"/>{item.dosage} • {item.time}</p></div></div><Button onClick={()=>toggle(item)} variant={item.status === "Taken" ? "secondary" : "default"} className="rounded-2xl">{item.status}</Button></motion.div>)}</div>}</CardContent></Card></div></div></section></div></main>
}
