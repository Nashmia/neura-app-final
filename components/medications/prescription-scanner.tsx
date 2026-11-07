"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ImageUp, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, redirectToLogin } from "@/lib/utils";

type ScannedMedication = {
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  times: string[];
  instructions: string;
  confidence: "high" | "medium" | "low";
};
type ScanResponse = { imageKind: string; readable: boolean; medications: ScannedMedication[]; notes: string };
type Row = { include: boolean; name: string; dosage: string; times: string; frequency: string; confidence: ScannedMedication["confidence"] };

const MAX_SIDE = 1600;

/** Shrinks a phone photo to at most 1600 px as a JPEG, enough to read a label and well under upload limits. */
async function shrinkImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file couldn't be opened as a photo. Please try a JPEG or PNG."));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the photo."))), "image/jpeg", 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toRow(m: ScannedMedication): Row {
  const dosage = [m.strength, m.dose].filter(Boolean).join(", ") + (m.instructions ? ` (${m.instructions})` : "");
  return { include: true, name: m.name, dosage, times: m.times.join(", "), frequency: m.frequency, confidence: m.confidence };
}

/**
 * Photo of a prescription, medicine box or pill bottle → medicines read by Gemini vision → the
 * caregiver checks and edits them → each dose time is added to the schedule as its own entry.
 */
export function PrescriptionScanner({ onAdded }: { onAdded: () => void | Promise<void> }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "scanning" | "review" | "saving">("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setRows([]); setNotes(""); setError(""); setState("idle");
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    reset();
    setDone("");
    setState("scanning");
    setPreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append("image", await shrinkImage(file), "scan.jpg");
      const r = await fetch("/api/medications/scan", { method: "POST", body: form });
      if (r.status === 401) return redirectToLogin();
      const d = (await r.json().catch(() => ({}))) as Partial<ScanResponse> & { error?: string };
      if (!r.ok) throw new Error(d.error || "Couldn't read the photo.");
      setNotes(d.notes || "");
      if (d.imageKind === "other") throw new Error(d.notes || "That doesn't look like a prescription or medicine label. Please try another photo.");
      if (!d.medications?.length) throw new Error(d.notes || "No medicines could be read from that photo. Try a closer, well-lit photo of the label.");
      setRows(d.medications.map(toRow));
      setState("review");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Please try again.");
      setState("idle");
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((v) => v.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setError("");
    const chosen = rows.filter((r) => r.include);
    if (!chosen.length) return setError("Tick at least one medicine to add.");
    for (const row of chosen) {
      if (row.name.trim().length < 2) return setError("Every medicine needs a name (at least 2 characters).");
      if (!row.dosage.trim()) return setError(`Enter the dosage for ${row.name}.`);
      if (!row.times.split(",").some((t) => t.trim())) return setError(`Enter at least one time for ${row.name} (for example 08:00 AM).`);
    }
    setState("saving");
    let added = 0;
    try {
      for (const row of chosen) {
        for (const time of row.times.split(",").map((t) => t.trim()).filter(Boolean)) {
          const r = await fetch("/api/medications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: row.name.trim(), dosage: row.dosage.trim(), time }),
          });
          if (r.status === 401) return redirectToLogin();
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Couldn't add ${row.name}.`);
          added++;
        }
      }
      reset();
      setDone(`Added ${added} dose${added === 1 ? "" : "s"} to the schedule.`);
      await onAdded();
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Something went wrong."}${added ? ` ${added} dose${added === 1 ? " was" : "s were"} added before this; check the schedule before retrying.` : ""}`);
      setState("review");
      await onAdded();
    }
  }

  const busy = state === "scanning" || state === "saving";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full border border-periwinkle bg-white text-navy"><ScanLine className="size-5" /></div>
          <div>
            <h2 className="text-[1.35rem] text-ink">Scan a prescription</h2>
            <p className="mt-1 text-sm text-slate-500">Photograph a prescription, medicine box or pill bottle and the medicines are filled in for you to check.</p>
          </div>
        </div>

        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />

        {state === "idle" && (
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" onClick={() => cameraInput.current?.click()}><Camera className="mr-2 size-4" />Take photo</Button>
            <Button type="button" variant="outline" className="bg-white" onClick={() => fileInput.current?.click()}><ImageUp className="mr-2 size-4" />Upload</Button>
          </div>
        )}

        {preview && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="The photo being read" className={cn("max-h-56 w-full object-contain", state === "scanning" && "opacity-60")} />
            {state === "scanning" && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow"><Loader2 className="size-4 animate-spin" />Reading the label…</span>
              </div>
            )}
            {state === "review" && (
              <button type="button" onClick={reset} aria-label="Discard this scan" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-slate-600 shadow hover:text-ink"><X className="size-4" /></button>
            )}
          </div>
        )}

        {(state === "review" || state === "saving") && (
          <div className="mt-5 space-y-4">
            <p className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Check every detail against the label before adding. Scans can misread names and doses.{notes ? ` ${notes}` : ""}</span>
            </p>
            {rows.map((row, i) => (
              <fieldset key={i} disabled={state === "saving"} className={cn("space-y-3 rounded-2xl border p-4", row.include ? "border-border bg-surface" : "border-dashed border-slate-300 opacity-60")}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input type="checkbox" checked={row.include} onChange={(e) => update(i, { include: e.target.checked })} className="size-4 accent-[#3442a8]" />
                    Add this medicine
                  </label>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", row.confidence === "high" ? "bg-emerald-100 text-emerald-800" : row.confidence === "medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>
                    {row.confidence === "high" ? "Clear" : row.confidence === "medium" ? "Check" : "Unclear"}
                  </span>
                </div>
                <div className="space-y-1.5"><Label htmlFor={`scan-name-${i}`}>Medicine name</Label><Input id={`scan-name-${i}`} value={row.name} onChange={(e) => update(i, { name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor={`scan-dose-${i}`}>Dosage</Label><Input id={`scan-dose-${i}`} value={row.dosage} onChange={(e) => update(i, { dosage: e.target.value })} placeholder="5 mg, 1 tablet" /></div>
                <div className="space-y-1.5">
                  <Label htmlFor={`scan-times-${i}`}>Times <span className="font-normal text-slate-500">(comma-separated)</span></Label>
                  <Input id={`scan-times-${i}`} value={row.times} onChange={(e) => update(i, { times: e.target.value })} placeholder="08:00 AM, 08:00 PM" />
                  {row.frequency && <p className="text-xs text-slate-500">Label says: {row.frequency}</p>}
                </div>
              </fieldset>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="bg-white" onClick={reset} disabled={busy}>Cancel</Button>
              <Button type="button" onClick={save} disabled={busy}>
                {state === "saving" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                {state === "saving" ? "Adding…" : "Add to schedule"}
              </Button>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        {done && <p role="status" className="mt-4 text-sm font-medium text-accent-ink">{done}</p>}
      </CardContent>
    </Card>
  );
}
