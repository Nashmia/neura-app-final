"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, ImagePlus, Loader2, LogOut, Trash2, UserPlus, UserRound, Users } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/layout/logo";
import { QUIZ_MAX_QUESTIONS, QUIZ_MIN_QUESTIONS } from "@/lib/quiz-limits";
import { redirectToLogin, resizeImageToDataUrl } from "@/lib/utils";

// Unsaved answers survive a refresh in this tab (photos excepted: they are too large for storage).
const DRAFT_KEY = "neura-onboarding-draft";

const quizLengthMessage = `Choose between ${QUIZ_MIN_QUESTIONS} and ${QUIZ_MAX_QUESTIONS} questions.`;

const labels = ["Caregiver Information", "Patient Details", "Family & Friends", "Quiz Setup"];

const schema = z.object({
  patientName: z.string().trim().min(2, "Enter the patient's name."),
  age: z.coerce.number().min(1, "Enter an age between 1 and 120.").max(120, "Enter an age between 1 and 120."),
  gender: z.string().trim().min(2, "Enter the patient's gender."),
  dementiaStage: z.string().trim().min(2, "Enter the dementia stage, e.g. Mild."),
  notes: z.string().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().optional().default(""),
        relationship: z.string().optional().default(""),
        type: z.enum(["Family", "Friend"]),
      })
    )
    .default([]),
  quizLength: z.coerce
    .number()
    .int(quizLengthMessage)
    .min(QUIZ_MIN_QUESTIONS, quizLengthMessage)
    .max(QUIZ_MAX_QUESTIONS, quizLengthMessage),
  quizDifficulty: z.string().trim().min(2, "Enter a difficulty, e.g. Easy."),
});
type Values = any;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { register, control, watch, reset, handleSubmit, trigger, formState: { isSubmitting, errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientName: "",
      age: "",
      gender: "",
      dementiaStage: "",
      notes: "",
      contacts: [],
      quizLength: 4,
      quizDifficulty: "Easy",
    },
  });
  const patientFields = ["patientName", "age", "gender", "dementiaStage"];

  // Restore an unfinished draft, then keep saving it as the caregiver types.
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (draft?.values) {
        reset({ ...draft.values, contacts: (draft.values.contacts || []).map((c: Record<string, unknown>) => ({ ...c, photo: "" })) });
        setStep(Math.min(Math.max(Number(draft.step) || 0, 0), labels.length - 1));
      }
    } catch {}
  }, [reset]);
  useEffect(() => {
    const sub = watch((values) => {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step })); } catch {}
    });
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: watch(), step })); } catch {}
    return () => sub.unsubscribe();
  }, [watch, step]);

  async function logout() {
    setSigningOut(true);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.replace("/login"); }
  }

  // Patient details are required, so check them before leaving that step.
  async function next() {
    if (step === 1 && !(await trigger(patientFields))) return;
    setStep((v) => Math.min(v + 1, labels.length - 1));
  }

  // If anything is still invalid at the end, jump back to the step that needs fixing.
  function onInvalid(formErrors: Record<string, unknown>) {
    setStep(patientFields.some((f) => f in formErrors) ? 1 : 3);
    setError("Please fix the highlighted fields.");
  }

  async function onPhoto(fieldId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setError("");
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhotos((prev) => ({ ...prev, [fieldId]: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    }
  }

  function removePhoto(fieldId: string) {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }
  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });
  // Photos are held in local state keyed by the field-array row id, then merged
  // into the payload at submit. (Storing image data URLs inside RHF field-array
  // items doesn't reliably survive submission.)
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const progress = ((step + 1) / labels.length) * 100;

  const watchedContacts = (watch("contacts") as { name?: string; type: string }[]) || [];
  const familyCount = watchedContacts.filter((c) => c.type === "Family").length;
  const friendsCount = watchedContacts.filter((c) => c.type === "Friend").length;

  async function submit(values: Values) {
    setError("");
    const withPhotos = (values.contacts || []).map((c: object, i: number) => ({
      ...c,
      photo: photos[fields[i]?.id] || "",
    }));
    const payload = {
      ...values,
      contacts: withPhotos.filter((c: { name?: string }) => c.name && c.name.trim()),
    };
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return redirectToLogin();
      // 409: setup was already finished (e.g. in another tab). Nothing to redo.
      if (!response.ok && response.status !== 409) throw new Error(data.error || "Could not save your setup.");
      setFinished(true); // keep the button disabled until the dashboard has loaded
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      router.replace("/dashboard");
    } catch (e) {
      // Everything entered stays in the form, so the caregiver can simply try again.
      const message = e instanceof Error ? e.message : "";
      setError(message && message !== "Failed to fetch" ? `${message} Your answers are still here.` : "Couldn't reach the server. Check your connection and press Finish setup again; your answers are still here.");
    }
  }

  return (
    <main className="soft-gradient relative min-h-screen overflow-hidden px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Button type="button" variant="outline" onClick={logout} disabled={signingOut} className="rounded-full bg-white"><LogOut className="mr-1 size-4" />{signingOut ? "Signing out..." : "Log out"}</Button>
        </div>
        <Card >
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <span className="eyebrow">Caregiver onboarding</span>
              <h1 className="mt-4 text-[2rem] leading-tight text-ink sm:text-[2.6rem]">Set up Neura in <em>four simple steps</em>.</h1>
              <p className="mt-3 max-w-2xl text-slate-600">Your answers are saved when you press Finish setup, and you can change them later in Profile &amp; settings. Joining someone else's care team instead? Open the invite link they sent you.</p>
            </div>
            {error && <div role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
            <div className="mb-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {labels.map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`grid size-10 place-items-center rounded-full border text-sm font-bold ${index <= step ? "border-primary bg-primary text-white" : "border-border bg-blue-50 text-slate-500"}`}>{index < step ? <Check className="size-5" /> : index + 1}</div>
                    <span className={`text-sm font-semibold ${index <= step ? "text-slate-950" : "text-slate-500"}`}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-periwinkle transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            </div>
            <form onSubmit={handleSubmit(submit, onInvalid)}>
              <div>
                <div key={step} className="animate-rise">
                  {step === 0 && (
                    <StepShell title="Caregiver Information" description="Your account is already active. Add patient details next." icon={<UserRound className="size-6" />}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Account owner" value="Current logged-in caregiver" disabled />
                        <Field label="Workspace type" value="Single patient care" disabled />
                      </div>
                    </StepShell>
                  )}
                  {step === 1 && (
                    <StepShell title="Patient Details" description="Add basic patient information for the dashboard and quiz context." icon={<UserRound className="size-6" />}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Patient name" placeholder="Patient's full name" error={errors.patientName?.message} props={register("patientName")} />
                        <Field label="Age" type="number" placeholder="e.g. 72" error={errors.age?.message} props={register("age")} />
                        <Field label="Gender" placeholder="e.g. Female" error={errors.gender?.message} props={register("gender")} />
                        <Field label="Dementia stage" placeholder="e.g. Mild, Moderate or Severe" error={errors.dementiaStage?.message} props={register("dementiaStage")} />
                        <div className="space-y-2 sm:col-span-2"><Label htmlFor="field-notes">Medical notes</Label><Textarea id="field-notes" {...register("notes")} /></div>
                      </div>
                    </StepShell>
                  )}
                  {step === 2 && (
                    <StepShell title="Family & Friends" description="Add the important people in the patient's life. Their names and relationships give context to caregivers and power recognition quizzes." icon={<Users className="size-6" />}>
                      <div className="space-y-4">
                        {fields.length === 0 && <p className="rounded-2xl border border-dashed border-blue-200 bg-surface p-6 text-center text-slate-500">No people added yet. Use the buttons below to add family members and friends.</p>}
                        {fields.map((field, index) => {
                          const type = watch(`contacts.${index}.type`) as string;
                          const photo = photos[field.id];
                          const name = watch(`contacts.${index}.name`) as string;
                          const isFamily = type === "Family";
                          return (
                            <motion.div key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isFamily ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>{isFamily ? <Users className="size-3.5" /> : <Heart className="size-3.5" />}{type}</span>
                                <button type="button" onClick={() => remove(index)} aria-label="Remove person" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="size-5" /></button>
                              </div>
                              <div className="flex flex-col gap-4 sm:flex-row">
                                <div className="flex flex-col items-center gap-2">
                                  <label className="group/photo relative grid size-24 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 transition hover:border-primary">
                                    {photo ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo} alt={name || "Contact photo"} className="size-full object-cover" />
                                        <span className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover/photo:opacity-100">Change</span>
                                      </>
                                    ) : (
                                      <span className="flex flex-col items-center gap-1 text-primary"><ImagePlus className="size-6" /><span className="text-[11px] font-semibold">Add photo</span></span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(field.id, e)} />
                                  </label>
                                  {photo && <button type="button" onClick={() => removePhoto(field.id)} className="text-xs font-medium text-slate-500 transition hover:text-red-600">Remove photo</button>}
                                </div>
                                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5"><Label>Full name</Label><Input placeholder="Full name" className="h-12" {...register(`contacts.${index}.name`)} /></div>
                                  <div className="space-y-1.5"><Label>Relationship</Label><Input placeholder="e.g. Daughter, Son, Friend" className="h-12" {...register(`contacts.${index}.relationship`)} /></div>
                                </div>
                              </div>
                              <input type="hidden" {...register(`contacts.${index}.type`)} />
                            </motion.div>
                          );
                        })}
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button type="button" variant="outline" onClick={() => append({ name: "", relationship: "", type: "Family", photo: "" })} className="h-12 flex-1 rounded-2xl bg-white"><UserPlus className="mr-2 size-4" />Add family member</Button>
                          <Button type="button" variant="outline" onClick={() => append({ name: "", relationship: "", type: "Friend", photo: "" })} className="h-12 flex-1 rounded-2xl bg-white"><Heart className="mr-2 size-4" />Add friend</Button>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{familyCount} family {familyCount === 1 ? "member" : "members"} • {friendsCount} {friendsCount === 1 ? "friend" : "friends"}</p>
                      </div>
                    </StepShell>
                  )}
                  {step === 3 && (
                    <StepShell title="Quiz Setup" description="Prepare recognition-based quiz preferences." icon={<UserRound className="size-6" />}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Preferred quiz length" type="number" error={errors.quizLength?.message} props={register("quizLength")} />
                        <Field label="Quiz difficulty" placeholder="e.g. Easy" error={errors.quizDifficulty?.message} props={register("quizDifficulty")} />
                      </div>
                    </StepShell>
                  )}
                </div>
              </div>
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep((v) => Math.max(v - 1, 0))} disabled={step === 0} className="h-12 rounded-2xl bg-white"><ArrowLeft className="mr-2 size-4" />Back</Button>
                {step < labels.length - 1
                  ? <Button key="next" type="button" onClick={next} className="h-12 rounded-2xl">Continue<ArrowRight className="ml-2 size-4" /></Button>
                  : <Button key="submit" type="submit" disabled={isSubmitting || finished} className="h-12">{isSubmitting || finished ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : <>Finish setup<Check className="ml-2 size-4" /></>}</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StepShell({ title, description, icon, children }: any) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-5 sm:p-7">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm">{icon}</div>
        <div><h2 className="text-[1.6rem] text-ink">{title}</h2><p className="mt-1 text-slate-600">{description}</p></div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, props, type = "text", value, disabled, placeholder, error }: any) {
  const id = `field-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} defaultValue={value} disabled={disabled} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={error ? "h-13 border-red-300" : "h-13"} {...props} />
      {error && <p id={`${id}-error`} className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
