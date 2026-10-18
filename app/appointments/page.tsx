"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Clock, Home, Loader2, MapPin, Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirectToLogin } from "@/lib/utils";

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
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/appointments");
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      const d = await r.json();
      setItems(d.appointments || []);
      setListError("");
    } catch {
      setListError("Couldn't load appointments. Refresh the page to try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function addAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    setNotice("");
    if (form.title.trim().length < 2) return setFormError("Enter a title (at least 2 characters).");
    if (!form.date || !form.time) return setFormError("Choose a date and a time.");
    setSaving(true);
    try {
      const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The appointment wasn't added.");
      setNotice(`${form.title.trim()} added for ${form.date} at ${form.time}.`);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Two-step cancel, and the list only changes once the server has recorded it.
  async function cancel(item: Appointment) {
    if (confirming !== item.id) return setConfirming(item.id);
    setCancelling(item.id);
    setListError("");
    try {
      const r = await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: "Cancelled" }) });
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      setItems((v) => v.map((a) => (a.id === item.id ? { ...a, status: "Cancelled" } : a)));
    } catch {
      setListError(`Couldn't cancel ${item.title}. It is still scheduled; please try again.`);
    } finally {
      setCancelling(null);
      setConfirming(null);
    }
  }

  // Compare in local time: date and time are what the caregiver entered on their own clock.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const scheduled = items.filter((a) => a.status === "Upcoming");
  const upcoming = scheduled.filter((a) => `${a.date}T${a.time}` >= localNow);
  const past = scheduled.filter((a) => `${a.date}T${a.time}` < localNow).reverse();

  return (
    <AppShell eyebrow="Schedule" title={<>Upcoming <em>appointments</em></>} description={"Schedule and track doctor visits and therapy sessions."} actions={<Button asChild variant="outline"><Link href="/dashboard"><Home className="mr-1 size-4"/>Dashboard</Link></Button>}>
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-[1.6rem] text-ink">New Appointment</h2>
                    <p className="mt-2 text-sm text-slate-500">Add a doctor visit, therapy session, or reminder.</p>
                  </div>
                  <form onSubmit={addAppointment} noValidate className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="appt-title">Title</Label>
                      <Input id="appt-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Neurologist checkup" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-type">Type</Label>
                      <select
                        id="appt-type"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as Appointment["type"] })}
                        className="flex h-12 w-full px-4 py-2 text-base rounded-[12px] border border-input bg-white text-ink transition hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25"
                      >
                        <option value="Doctor">Doctor</option>
                        <option value="Therapy">Therapy</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="appt-date">Date</Label>
                        <Input id="appt-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appt-time">Time</Label>
                        <Input id="appt-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-location">Location (optional)</Label>
                      <Input id="appt-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City Care Clinic" />
                    </div>
                    {formError && <p role="alert" className="text-sm font-medium text-red-600">{formError}</p>}
                    {notice && <p role="status" className="text-sm font-medium text-accent-ink">{notice}</p>}
                    <Button disabled={saving} className="w-full">
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                      {saving ? "Adding..." : "Add appointment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-[1.6rem] text-ink">Upcoming</h2>
                  {listError && <p role="alert" className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{listError}</p>}
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
                          className="hover-lift flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="grid size-12 place-items-center rounded-full bg-white text-navy">
                              <CalendarCheck className="size-6" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-ink">{item.title}</p>
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
                          <div className="flex shrink-0 items-center gap-2">
                            {confirming === item.id && cancelling !== item.id && (
                              <Button onClick={() => setConfirming(null)} variant="ghost" size="sm" className="rounded-2xl">Keep it</Button>
                            )}
                            <Button onClick={() => cancel(item)} disabled={cancelling === item.id} variant="outline" size="sm" className={confirming === item.id ? "rounded-2xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "rounded-2xl bg-white"}>
                              {cancelling === item.id ? <Loader2 className="mr-1 size-4 animate-spin" /> : <X className="mr-1 size-4" />}
                              {confirming === item.id ? "Confirm cancel" : "Cancel"}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {past.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-[1.2rem] text-ink">Past</h3>
                      <div className="mt-3 grid gap-3">
                        {past.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 rounded-3xl border border-border bg-white p-4 text-slate-500">
                            <div className="grid size-10 place-items-center rounded-full bg-surface"><CalendarCheck className="size-5" /></div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-700">{item.title}</p>
                              <p className="text-sm">{item.date} · {item.time}{item.location ? ` · ${item.location}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </AppShell>
  );
}
