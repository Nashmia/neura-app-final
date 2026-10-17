import Link from "next/link";
import { ArrowRight, Brain, CalendarDays, Check, ChevronDown, Eye, FilePlus2, Pill, Smile } from "lucide-react";
import { ArrowBubble, Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroArt } from "@/components/landing/hero-art";
import { GlowWave } from "@/components/layout/glow-wave";
import { cn } from "@/lib/utils";
import { faqs, howItWorks, landingFeatures, testimonials } from "@/lib/frontend-data";

const values = [
  { icon: CalendarDays, title: "Keep routines together", description: "Medication, activities, appointments and notes — all in one place, so you never have to juggle it all." },
  { icon: Eye, title: "Notice the small changes", description: "Track mood, behavior and progress over time. Subtle shifts matter, and Neura helps you see them." },
  { icon: FilePlus2, title: "Bring context to appointments", description: "Simple, organized records help you share what matters with doctors and other caregivers." },
];

// Where each feature row's arrow leads (logged-out visitors are sent to login first).
const featureLinks = ["/chat", "/medications", "/dashboard", "/settings"];
const featureGlyphs = [Trefoil, Burst, Bars, HeartGlyph];
const testimonialGlyphs = [Trefoil, HeartGlyph, Burst];

type ChipKind = "med" | "quiz" | "mood" | "appt";
const week: { day: string; date: string; chips: ChipKind[]; today?: boolean }[] = [
  { day: "Mon", date: "Oct 20", chips: ["med"] },
  { day: "Tue", date: "Oct 21", chips: ["quiz"] },
  { day: "Wed", date: "Oct 22", chips: ["mood"] },
  { day: "Thu", date: "Oct 23", chips: ["quiz"], today: true },
  { day: "Fri", date: "Oct 24", chips: ["mood"] },
  { day: "Sat", date: "Oct 25", chips: ["med", "quiz"] },
  { day: "Sun", date: "Oct 26", chips: ["appt"] },
];
const chipStyles: Record<ChipKind, { label: string; className: string }> = {
  med: { label: "Medication", className: "bg-lavender text-navy" },
  quiz: { label: "Memory quiz", className: "bg-navy text-white" },
  mood: { label: "Mood note", className: "bg-accent-ink text-white" },
  appt: { label: "Appointment", className: "border border-dashed border-slate-400 text-slate-600" },
};

const progressSeries = [
  { label: "Memory", value: 69, color: "#3442a8", dash: undefined, points: [40, 50, 57, 70, 69, 73, 69] },
  { label: "Attention", value: 57, color: "#1f255c", dash: "9 7", points: [28, 38, 45, 57, 56, 57, 57] },
  { label: "Orientation", value: 40, color: "#8ea0ff", dash: "3 6", points: [15, 23, 28, 40, 38, 37, 40] },
];

const todaysCare = [
  { icon: Pill, time: "8:00 AM", title: "Morning Medication", detail: <>Done • Donepezil 10mg</>, done: true },
  { icon: Brain, time: "10:00 AM", title: "Cognitive Exercise", detail: <>Memory Matching (5 min)</>, done: true },
  { icon: Pill, time: "1:00 PM", title: "Lunch Medication", detail: <><strong className="font-semibold text-white/85">Due</strong> • Donepezil 10mg</>, done: false },
  { icon: Smile, time: "5:00 PM", title: "Mood Journal", detail: <>Optional • 15–20 minutes</>, done: false },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-ink">
      <SiteHeader />

      {/* ───────────── Hero ───────────── */}
      <section className="on-dark relative -mt-16 overflow-hidden bg-navy pt-16 text-white lg:-mt-[72px] lg:pt-[72px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(142,160,255,0.10),transparent_45%)] [mask-image:linear-gradient(to_bottom,transparent_72px,#000_240px)]" />

        <div id="top" className="mx-auto w-full max-w-[1352px] px-4 sm:px-6 lg:px-8 relative grid scroll-mt-20 items-center lg:min-h-[438px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative z-10 max-w-[560px] pb-10 pt-8 sm:pt-10 lg:pb-14 lg:pt-6">
            <p className="kicker text-white/80">Care, with more clarity</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.06] text-[#f1f2fb] text-balance sm:text-[3.4rem] lg:text-[3.95rem]">Be there for the moments <em>that matter</em>.</h1>
            <p className="mt-6 max-w-[25rem] text-[16px] leading-[1.65] text-white/80">Neura brings medication routines, cognitive activities, mood notes and care progress into one clear place for at-home dementia caregivers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" className="h-11 px-6 text-[14px] font-semibold focus-visible:ring-offset-navy"><a href="#features">Explore Neura <ArrowRight className="size-4" /></a></Button>
              <Button asChild variant="ghost" className="h-11 border border-white/30 px-6 text-[14px] text-white/90 hover:border-white/50 hover:bg-white/[0.07] hover:text-white focus-visible:ring-offset-navy"><a href="#how">See how it works</a></Button>
            </div>
            <p className="mt-10 flex items-center gap-4 text-[12.5px] text-white/65"><span aria-hidden className="h-px w-9 bg-white/50" />Designed around the caregiver. Built for everyday use.</p>
          </div>
        </div>
        <HeroArt className="mx-auto w-full max-w-[640px] lg:absolute lg:bottom-0 lg:right-[max(0px,calc((100vw-1487px)/2))] lg:mx-0 lg:w-[822px] lg:max-w-[57vw]" />
      </section>

      {/* ───────────── Care is more than a checklist ───────────── */}
      <section id="about" className="section-padding scroll-mt-16 py-20 lg:scroll-mt-[72px] lg:py-24">
        <div className="container-neura grid gap-12 lg:grid-cols-[435px_1fr] lg:gap-0">
          <div>
            <h2 className="max-w-[300px] text-[2.75rem] leading-[1.1] text-ink" style={{ fontWeight: 600 }}>Care is more than a <em>checklist</em>.</h2>
            <p className="mt-5 max-w-[330px] text-[15px] leading-[1.65] text-slate-600">Neura gives you the tools to understand your loved one&apos;s day, spot changes early, and feel more confident in the care you provide.</p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-0">
            {values.map((item, i) => (
              <div key={item.title} className={cn("sm:pl-10 sm:pr-4", i === 0 && "sm:pl-0", i > 0 && "sm:border-l sm:border-slate-300/70")}>
                <span className="grid size-[50px] place-items-center rounded-full border border-periwinkle text-navy"><item.icon className="size-5" strokeWidth={1.6} /></span>
                <h3 className="mt-5 text-[19px] text-ink">{item.title}</h3>
                <p className="mt-3 max-w-[260px] text-[14px] leading-[1.6] text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <div aria-hidden className="section-padding"><div className="container-neura border-t border-slate-300/80" /></div>
      <section id="how" className="section-padding scroll-mt-16 py-20 lg:scroll-mt-[72px] lg:py-24">
        <div className="container-neura">
          <span className="eyebrow">How it works</span>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[2.4rem] leading-[1.1] text-ink sm:text-[3.15rem]">Get started in <em>three simple steps</em>.</h2>
              <p className="mt-3 text-[15px] leading-[1.65] text-slate-600">Designed for caregivers who need structure without complexity.</p>
            </div>
            <Button asChild className="h-12 w-fit pl-6 pr-4 text-[14px]"><Link href="/signup">Create caregiver account <ArrowBubble /></Link></Button>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-0">
            {howItWorks.map((step, i) => (
              <div key={step.title} className={cn("md:px-9", i === 0 && "md:pl-0", i > 0 && "md:border-l md:border-dashed md:border-slate-300")}>
                <p className="font-display text-[4.2rem] leading-none text-accent-ink">0{i + 1}</p>
                <h3 className="mt-6 text-[1.6rem] text-ink md:mt-10">{step.title}</h3>
                <p className="mt-3 max-w-[280px] text-[14px] leading-[1.65] text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="features" className="section-padding scroll-mt-8 pb-16 pt-8 lg:pb-20">
        <div className="container-neura">
          <div className="flex flex-col gap-6 pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-[600px] text-[2.4rem] leading-[1.12] text-ink sm:text-[2.95rem]">Everything caregivers need in one <em>calm workspace</em>.</h2>
              <p className="mt-4 max-w-[460px] text-[15px] leading-[1.65] text-slate-600">Neura combines daily care tools with a simple patient experience designed for accessibility.</p>
            </div>
            <Button asChild variant="accent" className="h-12 w-fit px-6 text-[14px] font-semibold"><Link href="/signup">Explore all features</Link></Button>
          </div>
          <div className="border-t border-slate-300/80">
            {landingFeatures.map((feature, i) => {
              const Glyph = featureGlyphs[i] ?? Burst;
              return (
                <div key={feature.title} className="grid items-center gap-4 border-b border-slate-300/80 py-7 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_440px_46px] lg:gap-x-[69px]">
                  <h3 className="flex items-center gap-4 text-[1.7rem] text-ink sm:text-[1.95rem]"><Glyph className={cn("size-5 shrink-0", i === 0 ? "text-blue-500" : "text-accent-ink")} />{feature.title}</h3>
                  <p className="max-w-[440px] text-[14px] leading-[1.65] text-slate-600 sm:order-3 sm:col-span-2 lg:order-none lg:col-span-1">{feature.description}</p>
                  <Link href={featureLinks[i]} aria-label={`Open ${feature.title}`} className="hidden size-[46px] place-items-center rounded-full border border-border bg-white text-navy transition hover:border-periwinkle hover:bg-lavender active:scale-95 sm:grid"><svg viewBox="0 0 12 12" className="size-3" fill="none"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Week at a glance ───────────── */}
      <section className="section-padding py-16 lg:py-20">
        <div className="container-neura">
          <span className="eyebrow">Inside Neura</span>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-[2.4rem] leading-[1.1] text-ink sm:text-[2.95rem]">See the whole week <em>at a glance</em>.</h2>
            <p className="max-w-[400px] text-[15px] leading-[1.65] text-slate-600 lg:pb-1">Medication, memory exercises, mood notes and appointments — every day of the week, in one calm view.</p>
          </div>
          <div className="mt-10 rounded-[1.75rem] border border-border bg-white p-5 shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl text-ink">This week at a glance</h3>
              <div className="flex items-center gap-3 text-[13px] text-slate-600">Oct 20 – 26 <SampleChip /></div>
            </div>
            <div className="-mx-1 mt-6 overflow-x-auto px-1 pb-1">
              <div className="grid min-w-[760px] grid-cols-7 gap-2.5">
                {week.map((d) => (
                  <div key={d.day} className={cn("min-h-[184px] rounded-2xl p-3.5", d.today ? "border border-periwinkle bg-blue-50" : "bg-surface")}>
                    <div className="flex items-start justify-between"><p className="text-[15px] font-semibold text-ink">{d.day}</p>{d.today && <span className="text-[10px] font-semibold tracking-[0.14em] text-accent-ink">TODAY</span>}</div>
                    <p className="mt-0.5 text-xs text-slate-600">{d.date}</p>
                    <div className="mt-3 space-y-2.5">{d.chips.map((c) => <div key={c} className={cn("rounded-[9px] px-2.5 py-2 text-[12.5px]", chipStyles[c].className)}>{chipStyles[c].label}</div>)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-xs text-slate-600">
              <span className="flex items-center gap-2"><span className="size-3 rounded-[3px] border border-blue-200 bg-lavender" />Medication</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-[3px] bg-navy" />Cognitive activity</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-[3px] bg-accent-ink" />Mood note</span>
              <span className="flex items-center gap-2"><span className="size-3 rounded-full border border-dashed border-slate-400" />Appointment</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Progress ───────────── */}
      <section className="section-padding py-16 lg:py-20">
        <div className="container-neura grid items-center gap-12 lg:grid-cols-[420px_1fr] lg:gap-16">
          <div>
            <span className="eyebrow">Progress</span>
            <h2 className="mt-5 text-[2.4rem] leading-[1.1] text-ink sm:text-[2.95rem]">Progress you can <em>actually read</em>.</h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-[1.65] text-slate-600">Weekly trends turn quiz sessions into simple, readable progress summaries.</p>
            <div className="mt-8 border-t border-slate-300/80">
              {progressSeries.map((s) => (
                <div key={s.label} className="flex items-center justify-between border-b border-slate-300/80 py-4">
                  <span className="flex items-center gap-3 text-[14px] text-ink"><svg width="26" height="4" aria-hidden><line x1="1" y1="2" x2="25" y2="2" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash ? (s.dash === "9 7" ? "6 3" : "2 3") : undefined} strokeLinecap="round" /></svg>{s.label}</span>
                  <span className="font-display text-[22px] text-ink">{s.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] text-slate-600">Small steps make a big difference.</p>
          </div>
          <div className="rounded-[1.75rem] border border-border bg-white p-5 shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl text-ink">Weekly progress</h3>
              <div className="flex items-center gap-3"><SampleChip /><Link href="/dashboard" className="text-xs text-accent-ink underline underline-offset-2 hover:text-navy">View full report →</Link></div>
            </div>
            <ProgressChart />
          </div>
        </div>
      </section>

      {/* ───────────── Today's care ───────────── */}
      <section className="section-padding py-16 lg:py-20">
        <div className="container-neura grid items-center gap-12 lg:grid-cols-[minmax(0,776px)_1fr] lg:gap-[72px]">
          <div className="on-dark rounded-[1.75rem] bg-navy p-6 text-white shadow-[0_40px_70px_-36px_rgba(31,37,92,0.65)] sm:p-8">
            <div className="flex items-center justify-between"><h3 className="text-[1.65rem] text-white">Today&apos;s care</h3><span className="text-[13px] text-white/70">Thu, Oct 23</span></div>
            <div className="mt-5 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full w-1/2 rounded-full bg-periwinkle" /></div><span className="text-[13px] text-white/85">2 of 4 done</span></div>
            <div className="mt-3">
              {todaysCare.map((item, i) => (
                <div key={item.title} className={cn("flex items-center gap-4 py-4 sm:gap-5", i > 0 && "border-t border-white/10")}>
                  <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-white/10 text-blue-200"><item.icon className="size-[18px]" /></span>
                  <span className="hidden w-[66px] shrink-0 text-[13px] text-white/70 sm:block">{item.time}</span>
                  <div className="min-w-0 flex-1"><p className="text-[15px] text-white">{item.title}</p><p className="mt-0.5 text-xs text-white/60"><span className="sm:hidden">{item.time} • </span>{item.detail}</p></div>
                  {item.done ? <span className="grid size-6 shrink-0 place-items-center rounded-full bg-periwinkle text-navy"><Check className="size-3.5" strokeWidth={3} /></span> : <span className="size-6 shrink-0 rounded-full border border-white/55" />}
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow">Daily routine</span>
            <h2 className="mt-5 text-[2.4rem] leading-[1.1] text-ink sm:text-[2.95rem]">Every dose and activity, <em>in order</em>.</h2>
            <p className="mt-4 max-w-[430px] text-[15px] leading-[1.65] text-slate-600">Medication, activities, appointments and notes — all in one place, so you never have to juggle it all.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Next up" title="Lunch Medication" detail="1:00 PM" />
              <MiniStat label="Done today" title="2 of 4 tasks" detail="Medication & exercise" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Testimonials ───────────── */}
      <section className="section-padding py-16 lg:py-20">
        <div className="container-neura">
          <div className="text-center">
            <span className="eyebrow">Testimonials</span>
            <h2 className="mt-5 text-[2.4rem] leading-[1.1] text-ink sm:text-[2.95rem]">Built for <em>families</em> and caregivers.</h2>
            <p className="mt-4 text-[15px] text-slate-600">A soft healthcare interface focused on confidence and ease of use.</p>
            <p className="mt-4 text-[11px] italic text-accent-ink/80">Placeholder quotes — replace with real feedback from user testing.</p>
          </div>
          <div className="mt-14 grid items-start gap-5 lg:grid-cols-3">
            {testimonials.map((t, i) => {
              const Glyph = testimonialGlyphs[i] ?? Burst;
              const featured = i === 1;
              return (
                <figure key={t.role} className={cn("rounded-[1.75rem] p-7 sm:p-8", featured ? "bg-navy text-white shadow-[0_34px_60px_-30px_rgba(31,37,92,0.6)] lg:mt-12" : "bg-white shadow-[0_24px_50px_-34px_rgba(31,37,92,0.3)]")}>
                  <Glyph className={cn("size-[18px]", featured ? "text-blue-300" : i === 0 ? "text-blue-500" : "text-accent-ink")} />
                  <blockquote className={cn("mt-5 font-display text-[1.32rem] leading-[1.35]", featured ? "text-white" : "text-ink")}>&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className={cn("mt-4 text-xs", featured ? "text-white/75" : "text-slate-600")}><span className={cn("font-semibold", featured ? "text-white" : "text-ink")}>{t.name}</span> · {t.role}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section id="faq" className="section-padding scroll-mt-16 pb-24 pt-16 lg:scroll-mt-[72px] lg:pb-28 lg:pt-20">
        <div className="container-neura grid gap-10 lg:grid-cols-[500px_1fr] lg:gap-0">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2 className="mt-5 text-[2.4rem] leading-[1.1] text-ink max-w-[420px] sm:text-[2.95rem]">Common questions about <em>Neura</em>.</h2>
            <p className="mt-5 text-[15px] text-slate-600">Clear answers for caregivers before they start.</p>
          </div>
          <div>
            {faqs.map((item, i) => (
              <details key={item.question} open={i === 0} className="faq group border-b border-slate-300/80 open:rounded-2xl open:border-transparent open:bg-white open:shadow-[0_20px_44px_-28px_rgba(31,37,92,0.35)]">
                <summary className="flex items-center justify-between gap-4 rounded-2xl px-6 py-6 font-display text-[1.2rem] text-ink transition-colors hover:text-accent-ink">{i + 1}. {item.question}<ChevronDown className="faq-chevron size-4 shrink-0 text-ink transition-transform" /></summary>
                <p className="-mt-2 max-w-[560px] px-6 pb-6 text-[14px] leading-[1.7] text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Closing CTA ───────────── */}
      <section className="grid lg:grid-cols-2">
        <div aria-hidden className="relative h-64 overflow-hidden bg-navy-deep sm:h-80 lg:h-auto lg:min-h-[460px]">
          <GlowWave className="absolute inset-0 size-full" />
        </div>
        <div className="flex flex-col justify-center bg-periwinkle px-6 py-16 text-navy sm:px-14 lg:py-20">
          <p className="kicker text-navy/80">Start with Neura</p>
          <h2 className="mt-3 max-w-[520px] text-[2.5rem] leading-[1.12] text-navy sm:text-[3.25rem] [&_em]:!text-navy">Give caregivers a <em>calmer way</em> to manage daily cognitive support.</h2>
          <p className="mt-6 max-w-[420px] text-[17px] leading-[1.6] text-navy/90">Create an account, add patient details, and begin guided daily care routines.</p>
          <Button asChild className="mt-8 h-12 w-fit pl-6 pr-4 text-[14px] focus-visible:ring-offset-periwinkle"><Link href="/signup">Create account <ArrowBubble /></Link></Button>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="section-padding bg-navy py-8 text-white">
        <div className="container-neura flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <Logo tone="light" textClassName="text-[1.35rem]" />
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-7 text-[14px] text-white/80">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
            <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
          </nav>
          <p className="text-xs text-white/70">© 2026 Neura. Not a substitute for medical advice.</p>
        </div>
      </footer>
    </main>
  );
}

function SampleChip() {
  return <span className="rounded-full bg-[#eceef2] px-2.5 py-1 text-[11px] font-semibold text-slate-700">Sample data</span>;
}

function MiniStat({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">{label}</p>
      <p className="mt-2 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function ProgressChart() {
  const x = (i: number) => 80 + i * 105;
  const y = (v: number) => 330 - v * 3;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <svg viewBox="0 0 760 370" className="mt-6 h-auto w-full" role="img" aria-label="Sample weekly progress chart for memory, attention and orientation">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1="80" x2="740" y1={y(v)} y2={y(v)} stroke={v === 0 ? "#c3c6d4" : "#eceef2"} strokeWidth="1.5" />
          <text x="58" y={y(v) + 5} textAnchor="end" fontSize="15" fill="#52567a">{v}</text>
        </g>
      ))}
      {days.map((d, i) => <text key={d} x={x(i)} y="362" textAnchor="middle" fontSize="15" fill="#52567a">{d}</text>)}
      {progressSeries.map((s) => (
        <g key={s.label}>
          <polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} strokeLinecap="round" strokeLinejoin="round" />
          {s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === s.points.length - 1 ? 7 : 5} fill={s.color} />)}
        </g>
      ))}
    </svg>
  );
}


/* Small decorative glyphs from the design. */
function Trefoil({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden><circle cx="6.5" cy="7" r="4.2" /><circle cx="13.5" cy="7" r="4.2" /><circle cx="10" cy="13.2" r="4.2" /></svg>;
}
function Burst({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden><path d="M10 0l2 6.2 5.8-3-3 5.8L20 10l-6.2 2 3 5.8-5.8-3L10 20l-2-6.2-5.8 3 3-5.8L0 10l6.2-2-3-5.8 5.8 3z" /></svg>;
}
function Bars({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden><rect x="2" y="10" width="4" height="8" rx="1" /><rect x="8" y="6" width="4" height="12" rx="1" /><rect x="14" y="2" width="4" height="16" rx="1" /></svg>;
}
function HeartGlyph({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden><path d="M10 18s-7.5-4.6-7.5-10A4.3 4.3 0 0110 5.2 4.3 4.3 0 0117.5 8c0 5.4-7.5 10-7.5 10z" /></svg>;
}
