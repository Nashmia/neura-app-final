"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

function JoinContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    if (!code) setStatus("error");
  }, [code]);

  async function join() {
    setStatus("joining");
    setError(null);
    const r = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json();
    if (r.status === 401) {
      setError("Please log in or create an account first, then open this invite link again.");
      setStatus("error");
      return;
    }
    if (!r.ok) {
      setError(d.error || "Could not join this care profile.");
      setStatus("error");
      return;
    }
    setPatientName(d.patient?.name || "");
    setStatus("done");
  }

  return (
    <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute left-1/4 top-16 size-80 bg-emerald-400/20 blur-3xl" />
        <div className="animate-blob anim-delay-3 absolute right-1/4 bottom-16 size-80 bg-teal-400/20 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="rounded-[2rem] border-blue-100 bg-white shadow-2xl shadow-blue-600/10">
          <CardContent className="p-8 text-center">
            <Logo className="mx-auto mb-6 justify-center" />
            {status === "done" ? (
              <>
                <CheckCircle2 className="mx-auto mb-4 size-16 text-emerald-500" />
                <h1 className="text-2xl font-bold text-slate-950">You're in</h1>
                <p className="mt-3 text-slate-600">You now have caregiver access to {patientName || "this patient"}'s care profile.</p>
                <Button asChild className="mt-6">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </>
            ) : !code ? (
              <>
                <h1 className="text-2xl font-bold text-slate-950">Invite link missing</h1>
                <p className="mt-3 text-slate-600">This link doesn't include an invite code. Ask the caregiver who invited you for a fresh link.</p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-4 size-14 text-primary" />
                <h1 className="text-2xl font-bold text-slate-950">Join a care team</h1>
                <p className="mt-3 text-slate-600">You've been invited to co-manage a patient's care profile on Neura. Log in first if you haven't already.</p>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <Button onClick={join} disabled={status === "joining"} className="mt-6 w-full">
                  {status === "joining" && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Join care team
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}
