"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { redirectToLogin } from "@/lib/utils";

/** Create a read-only, expiring link to the patient's clinical summary for a doctor, or revoke all such links. */
export function DoctorShareCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [expires, setExpires] = useState<number | null>(null);
  const [busy, setBusy] = useState<"create" | "revoke" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function create() {
    setBusy("create"); setMessage(null); setCopied(false);
    try {
      const r = await fetch("/api/doctor-share", { method: "POST" });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't create the link.");
      setUrl(d.url); setExpires(d.expiresAt);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!confirmRevoke) return setConfirmRevoke(true);
    setBusy("revoke"); setMessage(null);
    try {
      const r = await fetch("/api/doctor-share", { method: "DELETE" });
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) throw new Error();
      setUrl(null); setExpires(null);
      setMessage({ ok: true, text: "All doctor links are now turned off." });
    } catch {
      setMessage({ ok: false, text: "Couldn't revoke the links. Please try again." });
    } finally {
      setBusy(null); setConfirmRevoke(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ ok: false, text: "Your browser blocked copying. Select the link and copy it manually." });
    }
  }

  return (
    <Card id="doctor" className="scroll-mt-24">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full border border-periwinkle bg-white text-navy"><Stethoscope className="size-5" /></div>
          <h2 className="text-[1.35rem] text-ink">Share with a doctor</h2>
        </div>
        <p className="mt-3 text-sm text-slate-500">Create a private, read-only link to a clinical summary: medications, check-ins, moods, notes and appointments. No account needed. Links expire after 7 days.</p>
        <Button onClick={create} disabled={busy !== null} className="mt-5 w-full">
          {busy === "create" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Stethoscope className="mr-2 size-4" />}
          {url ? "Create a new link" : "Create doctor link"}
        </Button>
        {url && (
          <div className="mt-4 space-y-2">
            <p className="break-all rounded-2xl border border-border bg-surface p-3 text-sm text-slate-700">{url}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copy} variant="outline" className="bg-white">{copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}{copied ? "Copied" : "Copy link"}</Button>
              <Button asChild variant="outline" className="bg-white"><a href={url} target="_blank" rel="noopener"><ExternalLink className="mr-2 size-4" />Preview</a></Button>
            </div>
            {expires && <p className="text-xs text-slate-500">Works until {new Date(expires).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}. Anyone with the link can view the summary, so share it only with the doctor.</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button onClick={revoke} disabled={busy !== null} variant="outline" size="sm" className={confirmRevoke ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "bg-white"}>
            {busy === "revoke" && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmRevoke ? "Confirm: turn off all doctor links" : "Revoke all doctor links"}
          </Button>
          {confirmRevoke && <Button onClick={() => setConfirmRevoke(false)} variant="ghost" size="sm">Keep them</Button>}
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={`mt-3 text-sm font-medium ${message.ok ? "text-accent-ink" : "text-red-600"}`}>{message.text}</p>}
      </CardContent>
    </Card>
  );
}
