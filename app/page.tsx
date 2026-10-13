import Link from "next/link";
import { ArrowRight, CheckCircle2, Menu, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { faqs, howItWorks, landingFeatures, testimonials } from "@/lib/frontend-data";

const stats = [
  { value: "3 steps", label: "From sign-up to a ready dashboard" },
  { value: "100%", label: "Caregiver-controlled patient data" },
  { value: "Large-text", label: "Accessible screens for older adults" },
  { value: "Daily", label: "Medication & cognitive tracking" },
];

const footerColumns = [
  { title: "Product", links: ["Features", "How it works", "Dashboard", "Quizzes"] },
  { title: "Care", links: ["Medication", "Progress insights", "Caregiver guide", "FAQ"] },
  { title: "Company", links: ["About Neura", "Privacy", "Terms", "Contact"] },
];

export default function LandingPage() {
  return (
    <main className="soft-gradient min-h-screen">
      <header className="glass-nav sticky top-0 z-50">
        <div className="container-neura section-padding flex h-20 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#how" className="hover:text-primary">How it works</a>
            <a href="#faq" className="hover:text-primary">FAQ</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost"><Link href="/login">Login</Link></Button>
            <Button asChild size="lg"><Link href="/signup">Get started <ArrowRight className="ml-2 size-5" /></Link></Button>
          </div>
          <Button size="icon" variant="ghost" className="md:hidden"><Menu className="size-6" /></Button>
        </div>
      </header>

      <section className="section-padding relative overflow-hidden py-16 sm:py-20 lg:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute -left-24 top-4 size-80 bg-teal-400/20 blur-3xl" />
          <div className="animate-blob anim-delay-3 absolute -right-16 top-24 size-96 bg-emerald-400/20 blur-3xl" />
          <div className="animate-float-slow absolute bottom-0 left-1/3 size-72 rounded-full bg-teal-300/10 blur-3xl" />
        </div>
        <div className="container-neura grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
              <Sparkles className="size-4" /> AI-powered dementia care support
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">Support dementia care with clarity, calm, and confidence.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">Neura helps caregivers manage patient profiles, medication, cognitive quizzes, and progress insights from one accessible healthcare-inspired platform.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/signup">Start caregiver setup <ArrowRight className="ml-2 size-5" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/dashboard">View dashboard</Link></Button>
            </div>
            <div className="mt-8 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
              {['Large text UI','Medication tracking','Caregiver dashboard'].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-500" />{item}</div>)}
            </div>
          </div>

          <div className="animate-rise anim-delay-1">
            <Card className="soft-card animate-float-slow overflow-hidden">
              <CardContent className="p-5 sm:p-7">
                <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white">
                  <div className="flex items-center justify-between"><div><p className="text-sm text-blue-100">Today’s care plan</p><h2 className="mt-1 text-2xl font-bold">Patient progress</h2></div><ShieldCheck className="size-10" /></div>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">{[['Quiz','82%'],['Meds','5/6'],['Status','Stable']].map(([label,value]) => <div key={label} className="rounded-2xl bg-white/15 p-4 backdrop-blur"><p className="text-sm text-blue-100">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-5"><h3 className="font-semibold text-slate-950">Caregiver-first control</h3><p className="mt-2 text-sm leading-6 text-slate-600">Caregivers manage sensitive data and daily support tasks safely.</p></div>
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5"><h3 className="font-semibold text-slate-950">Patient-friendly quiz</h3><p className="mt-2 text-sm leading-6 text-slate-600">Large choices, calm screens, and minimal distractions.</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-padding pb-4 pt-6"><div className="container-neura"><div className="grid gap-4 rounded-[2rem] border border-blue-100 bg-white/70 p-6 shadow-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:p-8">{stats.map((stat) => <div key={stat.label} className="text-center lg:text-left"><p className="text-4xl font-extrabold text-gradient sm:text-5xl">{stat.value}</p><p className="mt-2 text-sm font-semibold text-slate-600">{stat.label}</p></div>)}</div></div></section>

      <section id="features" className="section-padding py-20"><div className="container-neura"><SectionHeading eyebrow="Features" title="Everything caregivers need in one calm workspace." description="Neura combines daily care tools with a simple patient experience designed for accessibility." /><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{landingFeatures.map((feature)=>{const Icon=feature.icon;return <div key={feature.title}><Card className="h-full rounded-3xl border-blue-100 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/10"><CardContent className="p-6"><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon className="size-6" /></div><h3 className="text-lg font-semibold text-slate-950">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p></CardContent></Card></div>})}</div></div></section>

      <section id="how" className="section-padding py-20"><div className="container-neura"><SectionHeading eyebrow="How it works" title="A simple flow for daily dementia care." description="Designed for caregivers who need structure without complexity." /><div className="mt-12 grid gap-6 lg:grid-cols-3">{howItWorks.map((step,index)=><Card key={step.title} className="rounded-3xl border-blue-100 bg-white shadow-sm"><CardContent className="p-7"><div className="mb-6 grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-white">{index+1}</div><h3 className="text-xl font-semibold text-slate-950">{step.title}</h3><p className="mt-3 leading-7 text-slate-600">{step.description}</p></CardContent></Card>)}</div></div></section>

      <section className="section-padding py-20"><div className="container-neura"><SectionHeading eyebrow="Testimonials" title="Built for families and caregivers." description="A soft healthcare interface focused on confidence and ease of use." /><div className="mt-12 grid gap-5 lg:grid-cols-3">{testimonials.map((item)=><Card key={item.name} className="rounded-3xl border-blue-100 bg-white/90 shadow-sm"><CardContent className="p-7"><p className="text-lg leading-8 text-slate-700">“{item.quote}”</p><div className="mt-6"><p className="font-semibold text-slate-950">{item.name}</p><p className="text-sm text-slate-500">{item.role}</p></div></CardContent></Card>)}</div></div></section>

      <section id="faq" className="section-padding py-20"><div className="container-neura max-w-4xl"><SectionHeading eyebrow="FAQ" title="Common questions about Neura." description="Clear answers for caregivers before they start." /><div className="mt-10 space-y-4">{faqs.map((item)=><Card key={item.question} className="rounded-3xl border-blue-100 bg-white"><CardContent className="p-6"><h3 className="text-lg font-semibold text-slate-950">{item.question}</h3><p className="mt-2 leading-7 text-slate-600">{item.answer}</p></CardContent></Card>)}</div></div></section>

      <section className="section-padding py-20"><div className="container-neura"><div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-500 p-8 text-white shadow-2xl shadow-blue-600/20 sm:p-12 lg:p-16"><div className="max-w-3xl"><p className="font-semibold text-blue-100">Start with Neura</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Give caregivers a calmer way to manage daily cognitive support.</h2><p className="mt-5 text-lg leading-8 text-blue-50">Create an account, add patient details, and begin guided daily care routines.</p><Button asChild size="lg" className="mt-8 bg-white text-blue-700 hover:bg-blue-50"><Link href="/signup">Create account <ArrowRight className="ml-2 size-5" /></Link></Button></div></div></div></section>

      <footer className="section-padding border-t border-blue-100 bg-white py-14"><div className="container-neura"><div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div className="max-w-sm"><Logo /><p className="mt-4 text-sm leading-6 text-slate-600">A calm, caregiver-first platform for daily dementia care — profiles, medication, and cognitive quizzes in one accessible workspace.</p></div>{footerColumns.map((col) => <div key={col.title}><h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">{col.title}</h3><ul className="mt-4 space-y-3 text-sm text-slate-600">{col.links.map((link) => <li key={link}><a href="#" className="transition hover:text-primary">{link}</a></li>)}</ul></div>)}</div><div className="mt-12 flex flex-col gap-3 border-t border-blue-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">© 2026 Neura. Supportive care technology, not medical diagnosis.</p><p className="text-sm text-slate-500">Built for caregivers and the people they care for.</p></div></div></footer>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="font-semibold text-primary">{eyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{title}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{description}</p></div>;
}
