"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Digest = { text: string; model: string; createdAt: string };

/** The AI-written weekly care digest. Loads after the dashboard, so a slow model never delays the page. */
export function CareDigestCard() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(refresh = false) {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/digest", { method: refresh ? "POST" : "GET" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The care digest couldn't be written right now.");
      setDigest(d.digest);
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[1.35rem] text-ink"><Sparkles className="size-5 text-primary" aria-hidden />This week, in brief</h2>
            <p className="text-sm text-slate-500">AI-written from this week&apos;s records. Also shown on the doctor summary.</p>
          </div>
          <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-full bg-white" onClick={() => load(true)} disabled={loading} aria-label="Write a fresh digest">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
        {loading && !digest ? (
          <div className="space-y-2" aria-label="Writing the digest">
            <div className="h-3 w-full animate-pulse rounded bg-surface" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-surface" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface" />
          </div>
        ) : digest ? (
          <>
            <p className="leading-7 text-slate-700">{digest.text}</p>
            <p className="mt-3 text-[11px] text-slate-500">
              Written by {digest.model} · {new Date(digest.createdAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · can be wrong; check against the records.
            </p>
          </>
        ) : null}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
