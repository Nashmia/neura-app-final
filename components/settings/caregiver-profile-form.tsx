"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirectToLogin } from "@/lib/utils";
import { SaveStatus, type Status } from "@/components/settings/save-status";

type Profile = { name: string; email: string; phone: string };

/** The signed-in caregiver's own details (name and phone are editable). */
export function CaregiverProfileForm() {
  const [form, setForm] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => {
        if (r.status === 401) return redirectToLogin();
        if (!r.ok) throw new Error();
        const d = await r.json();
        setForm({ name: d.user.name ?? "", email: d.user.email ?? "", phone: d.user.phone ?? "" });
      })
      .catch(() => setLoadError(true));
  }, []);

  function update(field: keyof Profile, value: string) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
    setErrors((e) => ({ ...e, [field]: undefined }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || status.kind === "saving") return;
    const nextErrors: typeof errors = {};
    if (form.name.trim().length < 2) nextErrors.name = "Enter your name (at least 2 characters).";
    if (form.phone.trim().length < 8) nextErrors.phone = "Enter a phone number with at least 8 digits.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus({ kind: "saving" });
    try {
      const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone }) });
      if (r.status === 401) return redirectToLogin();
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Your changes weren't saved.");
      setForm({ name: d.user.name, email: d.user.email, phone: d.user.phone });
      setStatus({ kind: "saved", message: "Your profile is saved." });
    } catch (err) {
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server.";
      setStatus({ kind: "error", message: `${message} Your changes are still here, so you can try again.` });
    }
  }

  return (
    <Card id="profile" className="scroll-mt-24">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full border border-periwinkle bg-white text-navy"><UserRound className="size-5" /></div>
          <div>
            <h2 className="text-[1.35rem] text-ink">Your profile</h2>
            <p className="text-sm text-slate-500">How you appear to other caregivers on this care team.</p>
          </div>
        </div>
        {loadError ? (
          <p role="alert" className="text-sm text-red-600">Couldn&apos;t load your profile. Refresh the page to try again.</p>
        ) : !form ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <form onSubmit={save} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="cg-name" label="Full name" value={form.name} error={errors.name} onChange={(v) => update("name", v)} autoComplete="name" />
              <TextField id="cg-phone" label="Phone" type="tel" value={form.phone} error={errors.phone} onChange={(v) => update("phone", v)} autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-email">Email</Label>
              <Input id="cg-email" value={form.email} readOnly aria-describedby="cg-email-help" className="bg-surface text-slate-600" />
              <p id="cg-email-help" className="text-sm text-slate-500">Your email is your sign-in, so it can&apos;t be changed here.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status.kind === "saving"}>
                {status.kind === "saving" && <Loader2 className="mr-2 size-4 animate-spin" />}
                {status.kind === "saving" ? "Saving..." : "Save profile"}
              </Button>
              <SaveStatus status={status} />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function TextField({ id, label, value, onChange, error, type = "text", placeholder, autoComplete }: {
  id: string; label: string; value: string | number; onChange: (v: string) => void; error?: string; type?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={error ? "border-red-300" : undefined}
      />
      {error && <p id={`${id}-error`} className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
