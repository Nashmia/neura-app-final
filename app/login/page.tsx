"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/auth-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";

const schema = z.object({ email: z.string().trim().email("Enter a valid email."), password: z.string().min(6, "Password must be at least 6 characters."), remember: z.boolean().optional() });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", remember: true } });
  const busy = isSubmitting || redirecting;
  const email = watch("email");

  useEffect(() => {
    // Error passed back by the no-JavaScript form fallback (see /api/auth/login).
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setServerError(params.get("error")!);
    if (params.get("email")) setValue("email", params.get("email")!);
    // Already signed in? Skip the form.
    fetch("/api/me").then((r) => r.json()).then((me) => { if (me?.user) router.replace(me.patient ? "/dashboard" : "/onboarding"); }).catch(() => {});
  }, [router, setValue]);

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      const result = await api<{ hasPatient: boolean }>("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      // Keep the button busy until the next page has loaded, so it can't be clicked twice.
      setRedirecting(true);
      router.replace(result.hasPatient ? "/dashboard" : "/onboarding");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setServerError(message && message !== "Failed to fetch" && message !== "Request failed" ? message : "Couldn't reach the server. Check your connection and try again.");
    }
  }

  return <AuthShell tagline="Welcome back to your caregiver workspace."><div className="mb-7"><h1 className="text-[2rem] leading-tight text-ink">Login</h1><p className="mt-2 text-sm text-slate-600">Access dashboard, medication tracking, and quizzes.</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}<form method="post" action="/api/auth/login" onSubmit={handleSubmit(onSubmit)} className="space-y-5"><div className="space-y-2"><Label>Email</Label><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type="email" autoComplete="email" autoFocus placeholder="caregiver@example.com" className="pl-12" {...register("email")} /></div>{errors.email && <p className="text-sm font-medium text-red-600">{errors.email.message}</p>}</div><div className="space-y-2"><Label>Password</Label><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" className="px-12" {...register("password")} /><button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>{errors.password && <p className="text-sm font-medium text-red-600">{errors.password.message}</p>}</div><div className="flex items-center justify-between gap-4"><label className="flex items-center gap-2 text-sm text-slate-600"><Checkbox checked={watch("remember")} onCheckedChange={(value) => setValue("remember", Boolean(value))} /> Remember me</label><Link href={email ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"} className="text-sm font-semibold text-accent-ink hover:underline">Forgot password?</Link></div><Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy && <Loader2 className="mr-2 size-5 animate-spin" />}{redirecting ? "Signing you in..." : "Login"}</Button></form><p className="mt-6 text-center text-sm text-slate-600">New to Neura? <Link href="/signup" className="font-semibold text-accent-ink">Create an account</Link></p></AuthShell>;
}
