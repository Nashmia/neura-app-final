"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";

const schema = z.object({ email: z.string().trim().email("Enter a valid email.") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email");
    if (email) setValue("email", email);
  }, [setValue]);

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      const result = await api<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(values) });
      setSentMessage(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setServerError(message && message !== "Failed to fetch" && message !== "Request failed" ? message : "Couldn't reach the server. Check your connection and try again.");
    }
  }

  return <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4 py-10"><div aria-hidden className="pointer-events-none absolute inset-0 -z-10"><div className="animate-blob absolute -left-20 top-10 size-72 bg-teal-400/20 blur-3xl" /><div className="animate-blob anim-delay-3 absolute -right-16 bottom-10 size-80 bg-emerald-400/20 blur-3xl" /></div><div className="animate-rise w-full max-w-md"><div className="mb-8 text-center"><Link href="/" className="text-3xl font-bold text-slate-950">Neura</Link><p className="mt-2 text-slate-600">Reset your caregiver account password.</p></div><Card className="rounded-[2rem] border-blue-100 bg-white/90 shadow-2xl shadow-blue-600/10 backdrop-blur"><CardContent className="p-6 sm:p-8">{sentMessage ? <div className="py-6 text-center"><MailCheck className="mx-auto size-14 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Check your email</h1><p className="mt-2 text-sm text-slate-600">{sentMessage}</p><p className="mt-2 text-sm text-slate-500">Not there? Check your spam folder, or try again in a minute.</p></div> : <><div className="mb-7"><h1 className="text-2xl font-bold text-slate-950">Forgot password</h1><p className="mt-2 text-sm text-slate-600">Enter your account email and we'll send you a link to choose a new password.</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}<form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5"><div className="space-y-2"><Label>Email</Label><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type="email" autoComplete="email" autoFocus placeholder="caregiver@example.com" className="pl-12" {...register("email")} /></div>{errors.email && <p className="text-sm font-medium text-red-600">{errors.email.message}</p>}</div><Button type="submit" disabled={isSubmitting} className="h-13 w-full rounded-2xl text-base">{isSubmitting && <Loader2 className="mr-2 size-5 animate-spin" />}Send reset link</Button></form></>}<p className="mt-6 text-center text-sm text-slate-600"><Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary"><ArrowLeft className="size-4" />Back to login</Link></p></CardContent></Card></div></main>;
}
