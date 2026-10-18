"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Home, Loader2, Pill, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirectToLogin } from "@/lib/utils";

type Medication = { id: string; name: string; dosage: string; time: string; status: "Taken" | "Pending" };

export default function MedicationsPage() {
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", dosage: "", time: "" });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/medications");
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      const d = await r.json();
      setItems(d.medications || []);
      setListError("");
    } catch {
      setListError("Couldn't load the medication list. Refresh the page to try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addMedication(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(""); setNotice("");
    if (form.name.trim().length < 2) return setFormError("Enter the medicine's name (at least 2 characters).");
    if (!form.dosage.trim() || !form.time.trim()) return setFormError("Enter both the dosage and the time.");
    setSaving(true);
    try {
      const r = await fetch("/api/medications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The medicine wasn't added.");
      setNotice(`${form.name.trim()} added to the schedule.`);
      setForm({ name: "", dosage: "", time: "" });
      await load();
    } catch (err) {
      // Keep what was typed so it can be resubmitted.
      setFormError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // The status only changes on screen once the server has recorded it.
  async function toggle(item: Medication) {
    if (updating) return;
    const next = item.status === "Taken" ? "Pending" : "Taken";
    setUpdating(item.id); setListError("");
    try {
      const r = await fetch("/api/medications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: next }) });
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      setItems((v) => v.map((m) => (m.id === item.id ? { ...m, status: next } : m)));
    } catch {
      setListError(`Couldn't update ${item.name}. It is still marked ${item.status.toLowerCase()}; please try again.`);
    } finally {
      setUpdating(null);
    }
  }

  return <AppShell eyebrow="Care routine" title={<>Medication <em>tracker</em></>} description={"Add, update, and review today’s medication status."} actions={<Button asChild variant="outline"><Link href="/dashboard"><Home className="mr-1 size-4"/>Dashboard</Link></Button>}><div className="grid gap-6 lg:grid-cols-[380px_1fr]"><Card><CardContent className="p-6"><div className="mb-6"><h2 className="text-[1.6rem] text-ink">Add Medication</h2><p className="mt-2 text-sm text-slate-500">Medicines are saved to this patient’s care profile.</p></div><form onSubmit={addMedication} noValidate className="space-y-4"><div className="space-y-2"><Label htmlFor="med-name">Medicine name</Label><Input id="med-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Donepezil" required /></div><div className="space-y-2"><Label htmlFor="med-dosage">Dosage</Label><Input id="med-dosage" value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} placeholder="5mg" required /></div><div className="space-y-2"><Label htmlFor="med-time">Time</Label><Input id="med-time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} placeholder="08:00 AM" required /></div>{formError && <p role="alert" className="text-sm font-medium text-red-600">{formError}</p>}{notice && <p role="status" className="text-sm font-medium text-accent-ink">{notice}</p>}<Button disabled={saving} className="w-full">{saving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Plus className="mr-2 size-4"/>}{saving ? "Adding..." : "Add medicine"}</Button></form></CardContent></Card><Card><CardContent className="p-6"><h2 className="text-[1.6rem] text-ink">Today’s Schedule</h2><p className="mt-1 text-sm text-slate-500">Tap a status to record whether today’s dose was taken.</p>{listError && <p role="alert" className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{listError}</p>}{loading?<p className="mt-6 text-slate-500">Loading...</p>:items.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-surface p-6 text-center text-slate-500">No medicines added yet. Add the first one with the form.</p> : <div className="mt-6 grid gap-4">{items.map((item,index)=><motion.div key={item.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.35,delay:index*.06}} className="hover-lift flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-full bg-white text-navy"><Pill className="size-6"/></div><div><p className="text-base font-semibold text-ink">{item.name}</p><p className="flex items-center gap-2 text-sm text-slate-500"><Clock className="size-4"/>{item.dosage} • {item.time}</p></div></div><Button onClick={()=>toggle(item)} disabled={updating === item.id} aria-label={`${item.name}: ${item.status === "Taken" ? "taken. Mark as pending" : "pending. Mark as taken"}`} variant={item.status === "Taken" ? "secondary" : "default"} className="rounded-2xl">{updating === item.id ? <Loader2 className="size-4 animate-spin"/> : item.status === "Taken" ? "Taken" : "Mark taken"}</Button></motion.div>)}</div>}</CardContent></Card></div></AppShell>
}
