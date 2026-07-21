"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/utils";

const schema = z.object({ name: z.string().min(2,"Name must be at least 2 characters."), email: z.string().email("Enter a valid email."), phone: z.string().min(8,"Enter a valid phone number."), password: z.string().min(6,"Password must be at least 6 characters."), confirmPassword: z.string().min(6,"Confirm your password.") }).refine((d)=>d.password===d.confirmPassword,{message:"Passwords do not match.",path:["confirmPassword"]});
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name:"", email:"", phone:"", password:"", confirmPassword:"" } });
  async function onSubmit(values: Values) { setServerError(""); try { await api("/api/auth/signup", { method:"POST", body: JSON.stringify(values) }); router.push("/onboarding"); } catch(error){ setServerError(error instanceof Error ? error.message : "Signup failed."); } }
  return <main className="soft-gradient relative grid min-h-screen place-items-center overflow-hidden px-4 py-10"><div aria-hidden className="pointer-events-none absolute inset-0 -z-10"><div className="animate-blob absolute -left-20 top-10 size-72 bg-teal-400/20 blur-3xl" /><div className="animate-blob anim-delay-3 absolute -right-16 bottom-10 size-80 bg-emerald-400/20 blur-3xl" /></div><motion.div initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.45}} className="w-full max-w-xl"><div className="mb-8 text-center"><Link href="/" className="text-3xl font-bold text-slate-950">Neura</Link><p className="mt-2 text-slate-600">Create your caregiver account.</p></div><Card className="rounded-[2rem] border-blue-100 bg-white/90 shadow-2xl shadow-blue-600/10 backdrop-blur"><CardContent className="p-6 sm:p-8"><div className="mb-7"><h1 className="text-2xl font-bold text-slate-950">Sign Up</h1><p className="mt-2 text-sm text-slate-600">Patient setup comes next after your account is created.</p></div>{serverError && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}<form onSubmit={handleSubmit(onSubmit)} className="space-y-5"><IconInput label="Full Name" icon={<UserRound className="size-5" />} placeholder="Your name" error={errors.name?.message} inputProps={register("name")} /><div className="grid gap-5 sm:grid-cols-2"><IconInput label="Email" icon={<Mail className="size-5" />} placeholder="caregiver@example.com" error={errors.email?.message} inputProps={register("email")} type="email" /><IconInput label="Phone" icon={<Phone className="size-5" />} placeholder="+92 300 0000000" error={errors.phone?.message} inputProps={register("phone")} /></div><div className="grid gap-5 sm:grid-cols-2"><PasswordInput label="Password" register={register("password")} error={errors.password?.message} show={showPassword} setShow={setShowPassword} /><PasswordInput label="Confirm Password" register={register("confirmPassword")} error={errors.confirmPassword?.message} show={showPassword} setShow={setShowPassword} /></div><Button type="submit" disabled={isSubmitting} className="h-13 w-full rounded-2xl text-base">{isSubmitting && <Loader2 className="mr-2 size-5 animate-spin" />}Create account</Button></form><p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-primary">Login</Link></p></CardContent></Card></motion.div></main>;
}

function IconInput({ label, icon, placeholder, inputProps, error, type="text" }: any) { return <div className="space-y-2"><Label>{label}</Label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span><Input type={type} placeholder={placeholder} className="pl-12" {...inputProps} /></div>{error && <p className="text-sm font-medium text-red-600">{error}</p>}</div>; }
function PasswordInput({ label, register, error, show, setShow }: any) { return <div className="space-y-2"><Label>{label}</Label><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type={show ? "text" : "password"} placeholder="Enter password" className="px-12" {...register} /><button type="button" onClick={()=>setShow((v:boolean)=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div>{error && <p className="text-sm font-medium text-red-600">{error}</p>}</div>; }
