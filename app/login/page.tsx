"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Enter a valid email."), password: z.string().min(6, "Password must be at least 6 characters."), remember: z.boolean().optional() });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", remember: false } });

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      const result = await api<{ hasPatient: boolean }>("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      router.push(result.hasPatient ? "/dashboard" : "/onboarding");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Login failed.");
    }
  }

  return <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4 py-10"><div aria-hidden className="pointer-events-none absolute inset-0 -z-10"><div className="animate-blob absolute -left-20 top-10 size-72 bg-teal-400/20 blur-3xl" /><div className="animate-blob anim-delay-3 absolute -right-16 bottom-10 size-80 bg-emerald-400/20 blur-3xl" /></div><div className="animate-rise w-full max-w-md"><div className="mb-8 text-center"><Link href="/" className="text-3xl font-bold text-slate-950">Neura</Link><p className="mt-2 text-slate-600">Welcome back to your caregiver workspace.</p></div><Card className="rounded-[2rem] border-blue-100 bg-white/90 shadow-2xl shadow-blue-600/10 backdrop-blur"><CardContent className="p-6 sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold text-slate-950">Login</h1><p className="mt-2 text-sm text-slate-600">Access dashboard, medication tracking, and quizzes.</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}<form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5"><div className="space-y-2"><Label>Email</Label><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type="email" placeholder="caregiver@example.com" className="pl-12" {...register("email")} /></div>{errors.email && <p className="text-sm font-medium text-red-600">{errors.email.message}</p>}</div><div className="space-y-2"><Label>Password</Label><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type={showPassword ? "text" : "password"} placeholder="Enter password" className="px-12" {...register("password")} /><button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>{errors.password && <p className="text-sm font-medium text-red-600">{errors.password.message}</p>}</div><div className="flex items-center justify-between gap-4"><label className="flex items-center gap-2 text-sm text-slate-600"><Checkbox checked={watch("remember")} onCheckedChange={(value) => setValue("remember", Boolean(value))} /> Remember me</label><Link href="#" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link></div><Button type="submit" disabled={isSubmitting} className="h-13 w-full rounded-2xl text-base">{isSubmitting && <Loader2 className="mr-2 size-5 animate-spin" />}Login</Button></form><p className="mt-6 text-center text-sm text-slate-600">New to Neura? <Link href="/signup" className="font-semibold text-primary">Create an account</Link></p></CardContent></Card></div></main>;
}
