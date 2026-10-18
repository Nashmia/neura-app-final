"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Bring the person back to this exact invite after logging in or signing up.
  const back = encodeURIComponent(`/join?code=${encodeURIComponent(code)}`);

  useEffect(() => {
    if (!code) setStatus("error");
    fetch("/api/me").then((r) => r.json()).then((me) => setSignedIn(Boolean(me?.user))).catch(() => setSignedIn(false));
  }, [code]);

  async function join() {
    setStatus("joining");
    setError(null);
    const r = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json();
    if (r.status === 401) {
      setSignedIn(false);
      setStatus("idle");
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
      <div className="animate-rise w-full max-w-md">
        <Card className="shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)]">
          <CardContent className="p-8 text-center">
            <Logo className="mx-auto mb-6 justify-center" />
            {status === "done" ? (
              <>
                <CheckCircle2 className="mx-auto mb-4 size-16 text-emerald-500" />
                <h1 className="text-[1.6rem] text-ink">You're in</h1>
                <p className="mt-3 text-slate-600">You now have caregiver access to {patientName || "this patient"}'s care profile.</p>
                <Button asChild className="mt-6">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </>
            ) : !code ? (
              <>
                <h1 className="text-[1.6rem] text-ink">Invite link missing</h1>
                <p className="mt-3 text-slate-600">This link doesn't include an invite code. Ask the caregiver who invited you for a fresh link.</p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-4 size-14 text-primary" />
                <h1 className="text-[1.6rem] text-ink">Join a care team</h1>
                <p className="mt-3 text-slate-600">You've been invited to co-manage a patient's care profile on Neura.</p>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                {signedIn === false ? (
                  <>
                    <p className="mt-3 text-sm text-slate-600">Log in or create a caregiver account first. You'll come straight back here to accept.</p>
                    <div className="mt-6 grid gap-3">
                      <Button asChild className="w-full"><Link href={`/login?next=${back}`}>Log in to accept</Link></Button>
                      <Button asChild variant="outline" className="w-full bg-white"><Link href={`/signup?next=${back}`}>Create an account</Link></Button>
                    </div>
                  </>
                ) : (
                  <Button onClick={join} disabled={status === "joining" || signedIn === null} className="mt-6 w-full">
                    {status === "joining" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Join care team
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
