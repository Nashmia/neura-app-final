"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";
import { safeNextPath } from "@/lib/access";

const schema = z.object({ name: z.string().min(2,"Name must be at least 2 characters."), email: z.string().trim().email("Enter a valid email."), phone: z.string().min(8,"Enter a valid phone number."), password: z.string().min(6,"Password must be at least 6 characters."), confirmPassword: z.string().min(6,"Confirm your password.") }).refine((d)=>d.password===d.confirmPassword,{message:"Passwords do not match.",path:["confirmPassword"]});
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    const nextPath = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    setNext(nextPath);
    // Already signed in? Don't offer a second account.
    fetch("/api/me").then((r) => r.json()).then((me) => { if (me?.user) router.replace(nextPath ?? (me.patient ? "/dashboard" : "/onboarding")); }).catch(() => {});
  }, [router]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name:"", email:"", phone:"", password:"", confirmPassword:"" } });
  async function onSubmit(values: Values) { setServerError(""); try { await api("/api/auth/signup", { method:"POST", body: JSON.stringify(values) }); setRedirecting(true); router.replace(next ?? "/onboarding"); } catch(error){ setServerError(error instanceof Error ? error.message : "Signup failed."); } }
  return <AuthShell tagline="Create your caregiver account." wide><div className="mb-7"><h1 className="text-[2rem] leading-tight text-ink">Sign Up</h1><p className="mt-2 text-sm text-slate-600">{next?.startsWith("/join") ? "After creating your account you can accept the care-team invite." : "Patient setup comes next after your account is created."}</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}<form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5"><IconInput label="Full Name" icon={<UserRound className="size-5" />} placeholder="Your name" error={errors.name?.message} inputProps={{ ...register("name"), autoComplete: "name" }} /><div className="grid gap-5 sm:grid-cols-2"><IconInput label="Email" icon={<Mail className="size-5" />} placeholder="caregiver@example.com" error={errors.email?.message} inputProps={{ ...register("email"), autoComplete: "email" }} type="email" /><IconInput label="Phone" icon={<Phone className="size-5" />} placeholder="+92 300 0000000" error={errors.phone?.message} inputProps={{ ...register("phone"), autoComplete: "tel" }} type="tel" /></div><div className="grid gap-5 sm:grid-cols-2"><PasswordInput label="Password" register={{ ...register("password"), autoComplete: "new-password" }} error={errors.password?.message} show={showPassword} setShow={setShowPassword} /><PasswordInput label="Confirm Password" register={{ ...register("confirmPassword"), autoComplete: "new-password" }} error={errors.confirmPassword?.message} show={showPassword} setShow={setShowPassword} /></div><Button type="submit" disabled={isSubmitting || redirecting} className="h-12 w-full text-base">{(isSubmitting || redirecting) && <Loader2 className="mr-2 size-5 animate-spin" />}Create account</Button></form><p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-accent-ink">Login</Link></p></AuthShell>;
}

function IconInput({ label, icon, placeholder, inputProps, error, type="text" }: any) { return <div className="space-y-2"><Label>{label}</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span><Input type={type} placeholder={placeholder} className="pl-12" {...inputProps} /></div>{error && <p className="text-sm font-medium text-red-600">{error}</p>}</div>; }
function PasswordInput({ label, register, error, show, setShow }: any) { return <div className="space-y-2"><Label>{label}</Label><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type={show ? "text" : "password"} placeholder="Enter password" className="px-12" {...register} /><button type="button" onClick={()=>setShow((v:boolean)=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>{error && <p className="text-sm font-medium text-red-600">{error}</p>}</div>; }
