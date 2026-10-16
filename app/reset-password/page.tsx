"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";

const schema = z.object({ password: z.string().min(6, "Password must be at least 6 characters."), confirmPassword: z.string().min(6, "Confirm your new password.") }).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      const result = await api<{ hasPatient: boolean }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: values.password }) });
      setDone(true);
      setTimeout(() => router.replace(result.hasPatient ? "/dashboard" : "/onboarding"), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setServerError(message && message !== "Failed to fetch" && message !== "Request failed" ? message : "Couldn't reach the server. Check your connection and try again.");
    }
  }

  const missingToken = token === "";

  return <AuthShell tagline="Choose a new password.">{done ? <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-14 text-accent-ink" /><h1 className="mt-4 text-[2rem] leading-tight text-ink">Password updated</h1><p className="mt-2 text-sm text-slate-600">You're signed in, and any other devices have been signed out. Taking you to your dashboard...</p><Loader2 className="mx-auto mt-5 size-6 animate-spin text-primary" /></div> : missingToken ? <div className="py-4 text-center"><h1 className="text-[2rem] leading-tight text-ink">Link incomplete</h1><p className="mt-2 text-sm text-slate-600">This page needs the link from your reset email. Open the email and click the button again, or request a new link.</p><Button asChild className="mt-6 h-12"><Link href="/forgot-password">Request a new link</Link></Button></div> : <><div className="mb-7"><h1 className="text-[2rem] leading-tight text-ink">Reset password</h1><p className="mt-2 text-sm text-slate-600">Pick a new password for your account. Other devices will be signed out.</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}{serverError.includes("expired") && <> <Link href="/forgot-password" className="underline">Request a new link</Link>.</>}</div>}<form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5">{(["password", "confirmPassword"] as const).map((field) => <div key={field} className="space-y-2"><Label>{field === "password" ? "New password" : "Confirm new password"}</Label><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type={showPassword ? "text" : "password"} autoComplete="new-password" autoFocus={field === "password"} placeholder="At least 6 characters" className="px-12" {...register(field)} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>{errors[field] && <p className="text-sm font-medium text-red-600">{errors[field]?.message}</p>}</div>)}<Button type="submit" disabled={isSubmitting || token === null} className="h-12 w-full text-base">{isSubmitting && <Loader2 className="mr-2 size-5 animate-spin" />}Save new password</Button></form></>}<p className="mt-6 text-center text-sm text-slate-600"><Link href="/login" className="inline-flex items-center gap-1 font-semibold text-accent-ink"><ArrowLeft className="size-4" />Back to login</Link></p></AuthShell>;
}
