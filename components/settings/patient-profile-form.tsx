"use client";

import { useEffect, useState } from "react";
import { Heart, ImagePlus, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUIZ_MAX_QUESTIONS, QUIZ_MIN_QUESTIONS } from "@/lib/quiz-limits";
import { redirectToLogin, resizeImageToDataUrl } from "@/lib/utils";
import { TextField } from "@/components/settings/caregiver-profile-form";
import { SaveStatus, type Status } from "@/components/settings/save-status";

type Contact = { id?: string; key: string; name: string; relationship: string; type: "Family" | "Friend"; notes?: string; photo?: string };
type Form = {
  patientName: string; age: string; gender: string; dementiaStage: string; notes: string;
  quizLength: string; quizDifficulty: string; contacts: Contact[];
};
type Field = Exclude<keyof Form, "contacts">;

let rowKey = 0;
const nextKey = () => `row-${++rowKey}`;

function fromPatient(p: Record<string, unknown>): Form {
  return {
    patientName: String(p.name ?? ""),
    age: String(p.age ?? ""),
    gender: String(p.gender ?? ""),
    dementiaStage: String(p.dementiaStage ?? ""),
    notes: String(p.notes ?? ""),
    quizLength: String(p.quizLength ?? QUIZ_MIN_QUESTIONS),
    quizDifficulty: String(p.quizDifficulty ?? ""),
    contacts: ((p.contacts as Contact[]) ?? []).map((c) => ({ ...c, key: nextKey() })),
  };
}

function validate(f: Form) {
  const e: Partial<Record<Field, string>> = {};
  if (f.patientName.trim().length < 2) e.patientName = "Enter the patient's name.";
  const age = Number(f.age);
  if (!Number.isInteger(age) || age < 1 || age > 120) e.age = "Enter an age between 1 and 120.";
  if (f.gender.trim().length < 2) e.gender = "Enter the patient's gender.";
  if (f.dementiaStage.trim().length < 2) e.dementiaStage = "Enter the dementia stage, e.g. Mild.";
  const q = Number(f.quizLength);
  if (!Number.isInteger(q) || q < QUIZ_MIN_QUESTIONS || q > QUIZ_MAX_QUESTIONS) e.quizLength = `Choose between ${QUIZ_MIN_QUESTIONS} and ${QUIZ_MAX_QUESTIONS} questions.`;
  if (f.quizDifficulty.trim().length < 2) e.quizDifficulty = "Enter a difficulty, e.g. Easy.";
  return e;
}

/**
 * Edit the existing patient in place (PATCH /api/patient). It never creates a
 * new patient, and medication, journal, appointment and quiz history are
 * untouched because they are stored against the patient's unchanged id.
 */
export function PatientProfileForm({ onSaved }: { onSaved?: (name: string) => void }) {
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    fetch("/api/patient")
      .then(async (r) => {
        if (r.status === 401) return redirectToLogin();
        if (!r.ok) throw new Error();
        setForm(fromPatient((await r.json()).patient));
      })
      .catch(() => setLoadError(true));
  }, []);

  const touched = () => { if (status.kind !== "saving") setStatus({ kind: "idle" }); };
  function update(field: Field, value: string) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
    setErrors((e) => ({ ...e, [field]: undefined }));
    touched();
  }
  function updateContact(key: string, patch: Partial<Contact>) {
    setForm((f) => (f ? { ...f, contacts: f.contacts.map((c) => (c.key === key ? { ...c, ...patch } : c)) } : f));
    touched();
  }
  function addContact(type: Contact["type"]) {
    setForm((f) => (f ? { ...f, contacts: [...f.contacts, { key: nextKey(), name: "", relationship: "", type, photo: "" }] } : f));
    touched();
  }
  function removeContact(key: string) {
    setForm((f) => (f ? { ...f, contacts: f.contacts.filter((c) => c.key !== key) } : f));
    touched();
  }
  async function onPhoto(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    try {
      updateContact(key, { photo: await resizeImageToDataUrl(file) });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not use that image.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || status.kind === "saving") return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const body = { ...form, contacts: form.contacts.filter((c) => c.name.trim()).map(({ key, ...c }) => c) };
      const r = await fetch("/api/patient", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The patient's details weren't saved.");
      setForm(fromPatient(d.patient));
      onSaved?.(d.patient.name);
      setStatus({ kind: "saved", message: "Patient profile saved." });
    } catch (err) {
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server.";
      setStatus({ kind: "error", message: `${message} Your changes are still here, so you can try again.` });
    }
  }

  return (
    <Card id="patient" className="scroll-mt-24">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full border border-periwinkle bg-white text-navy"><Users className="size-5" /></div>
          <div>
            <h2 className="text-[1.35rem] text-ink">Patient profile</h2>
            <p className="text-sm text-slate-500">Used across the dashboard, check-ins and the care assistant.</p>
          </div>
        </div>
        {loadError ? (
          <p role="alert" className="text-sm text-red-600">Couldn&apos;t load the patient&apos;s profile. Refresh the page to try again.</p>
        ) : !form ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <form onSubmit={save} noValidate className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="pt-name" label="Patient name" value={form.patientName} error={errors.patientName} onChange={(v) => update("patientName", v)} />
              <TextField id="pt-age" label="Age" type="number" value={form.age} error={errors.age} onChange={(v) => update("age", v)} />
              <TextField id="pt-gender" label="Gender" value={form.gender} error={errors.gender} onChange={(v) => update("gender", v)} />
              <TextField id="pt-stage" label="Dementia stage" placeholder="e.g. Mild, Moderate or Severe" value={form.dementiaStage} error={errors.dementiaStage} onChange={(v) => update("dementiaStage", v)} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pt-notes">Medical notes</Label>
                <Textarea id="pt-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
              </div>
              <TextField id="pt-quiz-length" label="Check-in length (questions)" type="number" value={form.quizLength} error={errors.quizLength} onChange={(v) => update("quizLength", v)} />
              <TextField id="pt-quiz-difficulty" label="Check-in difficulty" placeholder="e.g. Easy" value={form.quizDifficulty} error={errors.quizDifficulty} onChange={(v) => update("quizDifficulty", v)} />
            </div>

            <fieldset>
              <legend className="text-base font-semibold text-ink">Family &amp; friends</legend>
              <p className="mt-1 text-sm text-slate-500">People the patient knows. They give the care team context and are used in recognition check-ins.</p>
              {photoError && <p role="alert" className="mt-2 text-sm text-red-600">{photoError}</p>}
              <div className="mt-4 space-y-3">
                {form.contacts.length === 0 && <p className="rounded-2xl border border-dashed border-blue-200 bg-surface p-5 text-center text-sm text-slate-500">No people added yet.</p>}
                {form.contacts.map((c) => (
                  <div key={c.key} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-3 sm:flex-col">
                      <label className="relative grid size-16 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-white text-primary transition hover:border-primary focus-within:ring-2 focus-within:ring-ring">
                        {c.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photo} alt={c.name ? `Photo of ${c.name}` : "Contact photo"} className="size-full object-cover" />
                        ) : (
                          <ImagePlus className="size-5" aria-hidden />
                        )}
                        <span className="sr-only">{c.photo ? "Change photo" : "Add photo"}{c.name ? ` for ${c.name}` : ""}</span>
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(c.key, e)} />
                      </label>
                      {c.photo && <button type="button" onClick={() => updateContact(c.key, { photo: "" })} className="text-xs font-medium text-slate-500 hover:text-red-600">Remove photo</button>}
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${c.key}-name`}>Full name</Label>
                        <Input id={`${c.key}-name`} value={c.name} onChange={(e) => updateContact(c.key, { name: e.target.value })} placeholder="Full name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${c.key}-rel`}>Relationship</Label>
                        <Input id={`${c.key}-rel`} value={c.relationship} onChange={(e) => updateContact(c.key, { relationship: e.target.value })} placeholder="e.g. Daughter, Neighbour" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`${c.key}-type`}>Type</Label>
                        <select id={`${c.key}-type`} value={c.type} onChange={(e) => updateContact(c.key, { type: e.target.value as Contact["type"] })} className="flex h-12 w-full rounded-[12px] border border-input bg-white px-4 text-base text-ink focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25 sm:w-48">
                          <option value="Family">Family</option>
                          <option value="Friend">Friend</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeContact(c.key)} aria-label={`Remove ${c.name || "this person"}`} className="self-end rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 sm:self-start"><Trash2 className="size-5" /></button>
                  </div>
                ))}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => addContact("Family")} className="flex-1 bg-white"><UserPlus className="mr-2 size-4" />Add family member</Button>
                  <Button type="button" variant="outline" onClick={() => addContact("Friend")} className="flex-1 bg-white"><Heart className="mr-2 size-4" />Add friend</Button>
                </div>
                <p className="text-xs text-slate-500">Removing a person takes effect when you save.</p>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status.kind === "saving"}>
                {status.kind === "saving" && <Loader2 className="mr-2 size-4 animate-spin" />}
                {status.kind === "saving" ? "Saving..." : "Save patient profile"}
              </Button>
              <SaveStatus status={status} />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
