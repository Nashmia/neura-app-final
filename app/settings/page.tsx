"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Home, Loader2, UserPlus, Users } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Caregiver = { id: string; name: string; email: string };

export default function SettingsPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/settings");
    if (r.status === 401) return (location.href = "/login");
    const d = await r.json();
    setCaregivers(d.caregivers || []);
    setPatientName(d.patient?.name || "");
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function generateInvite() {
    setGenerating(true);
    setError(null);
    setCopied(false);
    const r = await fetch("/api/invite", { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Could not create an invite link.");
    else setInviteUrl(d.url);
    setGenerating(false);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="dashboard-shell min-h-screen">
      <div className="flex">
        <AppSidebar />
        <section className="w-full lg:pl-72">
          <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/75 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div>
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Settings</h1>
                <p className="hidden text-sm text-slate-500 sm:block">Manage who can access {patientName || "this patient"}'s care profile.</p>
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
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-primary">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">Caregivers</h2>
                      <p className="text-sm text-slate-500">Everyone who can view and update this care profile.</p>
                    </div>
                  </div>
                  {loading ? (
                    <p className="text-slate-500">Loading...</p>
                  ) : (
                    <div className="grid gap-3">
                      {caregivers.map((c, index) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
                        >
                          <div className="grid size-11 place-items-center rounded-2xl bg-white text-base font-bold text-primary">{c.name?.[0] || "?"}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-950">{c.name}</p>
                            <p className="truncate text-sm text-slate-500">{c.email}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-blue-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-950">Invite a caregiver</h2>
                  <p className="mt-2 text-sm text-slate-500">Generate a shareable link so a family member can join this care profile. Links expire after 7 days.</p>
                  <Button onClick={generateInvite} disabled={generating} className="mt-5 w-full">
                    {generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                    Generate invite link
                  </Button>
                  {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                  {inviteUrl && (
                    <div className="mt-4 space-y-2">
                      <p className="break-all rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-700">{inviteUrl}</p>
                      <Button onClick={copyInvite} variant="outline" className="w-full rounded-2xl bg-white">
                        {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                        {copied ? "Copied" : "Copy link"}
                      </Button>
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
