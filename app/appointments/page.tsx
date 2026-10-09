"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Clock, Home, Loader2, MapPin, Plus, X } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Appointment = {
  id: string;
  title: string;
  type: "Doctor" | "Therapy" | "Other";
  date: string;
  time: string;
  location?: string;
  notes?: string;
  status: "Upcoming" | "Cancelled";
};

const emptyForm = { title: "", type: "Doctor" as Appointment["type"], date: "", time: "", location: "" };

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const r = await fetch("/api/appointments");
    if (r.status === 401) return (location.href = "/login");
    const d = await r.json();
    setItems(d.appointments || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function addAppointment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) {
      setForm(emptyForm);
      await load();
    }
    setSaving(false);
  }

  async function cancel(item: Appointment) {
    await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: "Cancelled" }) });
    setItems((v) => v.map((a) => (a.id === item.id ? { ...a, status: "Cancelled" } : a)));
  }

  const upcoming = items.filter((a) => a.status === "Upcoming");

  return (
    <main className="dashboard-shell min-h-screen">
      <div className="flex">
        <AppSidebar />
        <section className="w-full lg:pl-72">
          <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/75 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div>
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Appointments</h1>
                <p className="hidden text-sm text-slate-500 sm:block">Schedule and track doctor visits and therapy sessions.</p>
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
              <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-950">New Appointment</h2>
                    <p className="mt-2 text-sm text-slate-500">Add a doctor visit, therapy session, or reminder.</p>
                  </div>
                  <form onSubmit={addAppointment} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Neurologist checkup" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as Appointment["type"] })}
                        className="flex h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 py-2 text-base shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="Doctor">Doctor</option>
                        <option value="Therapy">Therapy</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location (optional)</Label>
                      <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City Care Clinic" />
                    </div>
                    <Button disabled={saving} className="w-full">
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                      Add appointment
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-slate-950">Upcoming</h2>
                  {loading ? (
                    <p className="mt-6 text-slate-500">Loading...</p>
                  ) : upcoming.length === 0 ? (
                    <p className="mt-6 text-slate-500">No upcoming appointments yet.</p>
                  ) : (
                    <div className="mt-6 grid gap-4">
                      {upcoming.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.06 }}
                          className="hover-lift flex flex-col gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="grid size-12 place-items-center rounded-2xl bg-white text-primary">
                              <CalendarCheck className="size-6" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-950">{item.title}</p>
                              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-4" />
                                  {item.date} · {item.time}
                                </span>
                                {item.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="size-4" />
                                    {item.location}
                                  </span>
                                )}
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary">{item.type}</span>
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => cancel(item)} variant="outline" size="sm" className="rounded-2xl bg-white">
                            <X className="mr-1 size-4" />
                            Cancel
                          </Button>
                        </motion.div>
                      ))}
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
