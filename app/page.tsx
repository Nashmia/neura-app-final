import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { Brain, CalendarDays, Check, Eye, FilePlus2, Pill, Smile } from "lucide-react";
import { ArrowBubble, Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { SiteHeader } from "@/components/landing/site-header";
import { HeroArt } from "@/components/landing/hero-art";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { RevealGroup } from "@/components/landing/reveal-group";
import { GlowWave } from "@/components/layout/glow-wave";
import { cn } from "@/lib/utils";
import { faqs, howItWorks, landingFeatures } from "@/lib/frontend-data";

// Landing-only fonts, scoped via `.landing-type` (globals.css) so the app's
// own screens keep DM Sans and Source Serif 4.
const heroDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-hero-display",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const values = [
  { icon: CalendarDays, title: "Keep daily care in one place", description: "Organize medication, cognitive activities, appointments, and notes without jumping between scattered records." },
  { icon: Eye, title: "Notice patterns over time", description: "Review recorded moods and cognitive activity history to see what's been documented across days and weeks." },
  { icon: FilePlus2, title: "Bring context to appointments", description: "Keep useful care records organized so you can share relevant observations with healthcare professionals." },
];

const benefits = [
  { title: "Less scattered information", description: "Keep everyday care records together instead of relying on disconnected notes." },
  { title: "A simpler daily overview", description: "See scheduled tasks and recorded activities without navigating a complicated interface." },
  { title: "More context over time", description: "Review saved observations and activity history when reflecting on care or preparing for an appointment." },
];

// Where each feature row's arrow leads (logged-out visitors are sent to login first).
const featureLinks = ["/chat", "/medications", "/dashboard", "/settings"];
const featureGlyphs = [Trefoil, Burst, Bars, HeartGlyph];
const benefitGlyphs = [Trefoil, HeartGlyph, Burst];

// One consistent illustrative week (Mon 19 – Sun 25 October 2026), shown as sample data.
type ChipKind = "med" | "quiz" | "mood" | "appt";
const week: { day: string; date: string; chips: ChipKind[]; today?: boolean }[] = [
  { day: "Mon", date: "Oct 19", chips: ["med"] },
  { day: "Tue", date: "Oct 20", chips: ["quiz"] },
  { day: "Wed", date: "Oct 21", chips: ["mood"] },
  { day: "Thu", date: "Oct 22", chips: ["quiz"], today: true },
  { day: "Fri", date: "Oct 23", chips: ["mood"] },
  { day: "Sat", date: "Oct 24", chips: ["med", "quiz"] },
  { day: "Sun", date: "Oct 25", chips: ["appt"] },
];
const SAMPLE_RANGE = "Oct 19 – 25";
const SAMPLE_TODAY = "Thu, Oct 22";
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
    <main className={cn(heroDisplay.variable, manrope.variable, "landing-type min-h-screen bg-background text-ink")}>
      <SiteHeader />

      {/* ───────────── Hero ───────────── */}
      <section className="landing-hero on-dark relative -mt-16 overflow-hidden bg-navy pt-16 text-white lg:-mt-[72px] lg:pt-[72px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(142,160,255,0.10),transparent_45%)] [mask-image:linear-gradient(to_bottom,transparent_72px,#000_240px)]" />

        <div id="top" className="mx-auto w-full max-w-[1352px] px-4 sm:px-6 lg:px-8 relative grid scroll-mt-20 items-center lg:min-h-[calc(min(822px,57vw)*0.555+64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative z-10 max-w-[560px] pb-10 pt-8 sm:pt-10 lg:py-12">
            <h1 className="landing-h1 text-[#f1f2fb]">Dementia care, less scattered. <em className="landing-h1-sub">Everything you need to stay on track.</em></h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" className="h-11 px-6 text-[15px] font-semibold focus-visible:ring-offset-navy"><Link href="/signup">Create caregiver account</Link></Button>
              <Button asChild variant="ghost" className="h-11 border border-white/30 px-6 text-[15px] text-white/90 hover:border-white/50 hover:bg-white/[0.07] hover:text-white focus-visible:ring-offset-navy"><a href="#how">Explore how it works</a></Button>
            </div>
          </div>
        </div>
        <HeroArt className="mx-auto w-full max-w-[640px] lg:absolute lg:right-[max(0px,calc((100vw-1487px)/2))] lg:top-[calc(50%+36px)] lg:mx-0 lg:w-[822px] lg:max-w-[57vw] lg:-translate-y-[57%]" />
      </section>

      {/* ───────────── The problem ───────────── */}
      <section id="about" className="section-padding scroll-mt-16 bg-section-offwhite py-20 lg:scroll-mt-[72px] lg:py-24">
        <div className="container-neura grid gap-12 lg:grid-cols-[480px_1fr] lg:gap-0">
          <div className="lg:pr-14">
            <p className="landing-eyebrow">Care, beyond the checklist</p>
            <h2 className="landing-h2 landing-h2-compact mt-4 text-ink">There&apos;s a lot to keep track of. <span className="text-accent-ink">You shouldn&apos;t have to keep it all in your head.</span></h2>
            <p className="landing-lead mt-5 max-w-[380px] text-slate-600">Between medication schedules, daily activities, changing moods, and appointments, the little details can be easy to lose track of. Neura brings them together, giving you a clearer picture of your loved one&apos;s day.</p>
          </div>
          <RevealGroup className="grid gap-10 sm:grid-cols-3 sm:gap-0 lg:pt-10">
            {values.map((item, i) => (
              <div key={item.title} className={cn("reveal-item sm:pl-8 sm:pr-4", i === 0 && "sm:pl-0", i > 0 && "sm:border-l sm:border-slate-300/70")}>
                <span className="grid size-[50px] place-items-center rounded-full border border-periwinkle text-navy"><item.icon className="size-5" strokeWidth={1.6} /></span>
                <h3 className="landing-h3 mt-5 text-ink">{item.title}</h3>
                <p className="landing-body mt-3 max-w-[270px] text-slate-600">{item.description}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section id="how" className="section-padding scroll-mt-16 bg-section-sage py-20 lg:scroll-mt-[72px] lg:py-24">
        <div className="container-neura">
          <p className="landing-eyebrow">A simpler way to get started</p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="landing-h2 max-w-[640px] text-ink">Three steps to a more organized care routine.</h2>
              <p className="landing-lead mt-4 max-w-[520px] text-slate-600">Set up your workspace once, then use it to support the everyday rhythm of care.</p>
            </div>
            <Button asChild className="h-12 w-fit shrink-0 pl-6 pr-4 text-[15px]"><Link href="/signup">Create caregiver account <ArrowBubble /></Link></Button>
          </div>
          <RevealGroup className="mt-16 grid gap-12 md:grid-cols-3 md:gap-0">
            {howItWorks.map((step, i) => (
              <div key={step.title} className={cn("reveal-item md:px-9", i === 0 && "md:pl-0", i > 0 && "md:border-l md:border-dashed md:border-slate-300")}>
                <p className="font-display text-[4rem] leading-none text-accent-ink">0{i + 1}</p>
                <h3 className="landing-h3 mt-6 text-ink md:mt-10">{step.title}</h3>
                <p className="landing-body mt-3 max-w-[300px] text-slate-600">{step.description}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="features" className="section-padding scroll-mt-16 bg-section-offwhite py-16 lg:scroll-mt-[72px] lg:py-20">
        <div className="container-neura">
          <div className="flex flex-col gap-6 pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="landing-eyebrow">One workspace. The details that matter.</p>
              <h2 className="landing-h2 mt-4 max-w-[620px] text-ink">Everything you need to stay on top of daily care.</h2>
              <p className="landing-lead mt-4 max-w-[540px] text-slate-600">From everyday routines to longer-term observations, Neura keeps essential care tools together in one calm, accessible experience.</p>
            </div>
            <Button asChild variant="accent" className="h-12 w-fit shrink-0 px-6 text-[15px] font-semibold"><Link href="/signup">Explore all features</Link></Button>
          </div>
          <RevealGroup className="border-t border-slate-300/80">
            {landingFeatures.map((feature, i) => {
              const Glyph = featureGlyphs[i] ?? Burst;
              return (
                <div key={feature.title} className="reveal-item grid items-center gap-4 border-b border-slate-300/80 py-7 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_460px_46px] lg:gap-x-[60px]">
                  <h3 className="flex items-center gap-4 text-[1.55rem] leading-tight text-ink sm:text-[1.8rem]"><Glyph className={cn("size-5 shrink-0", i === 0 ? "text-blue-500" : "text-accent-ink")} />{feature.title}</h3>
                  <p className="landing-body max-w-[460px] text-slate-600 sm:order-3 sm:col-span-2 lg:order-none lg:col-span-1">{feature.description}</p>
                  <Link href={featureLinks[i]} aria-label={`Open ${feature.title}`} className="hidden size-[46px] place-items-center rounded-full border border-border bg-white text-navy transition hover:border-periwinkle hover:bg-lavender active:scale-95 sm:grid"><svg viewBox="0 0 12 12" className="size-3" fill="none"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
                </div>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── Weekly overview ───────────── */}
      <section className="section-padding bg-section-lavender py-16 lg:py-20">
        <div className="container-neura">
          <p className="landing-eyebrow">A clearer view of the week</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="landing-h2 text-ink">The little details add up.</h2>
            <p className="landing-lead max-w-[460px] text-slate-600 lg:pb-1">See medication routines, cognitive activities, mood notes, and appointments together in one weekly view — without piecing the story together from different places.</p>
          </div>
          <RevealGroup>
          <div className="reveal-item app-preview mt-10 rounded-[1.75rem] border border-border bg-white p-5 shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl text-ink">This week at a glance</h3>
              <div className="flex items-center gap-3 text-[13px] text-slate-600">{SAMPLE_RANGE} <SampleChip /></div>
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
          </RevealGroup>
          <p className="mt-4 text-[13px] text-slate-600">Illustrative dashboard using sample data.</p>
        </div>
      </section>

      {/* ───────────── Progress insights ───────────── */}
      <section className="section-padding bg-section-offwhite py-16 lg:py-20">
        <RevealGroup className="container-neura grid items-center gap-12 lg:grid-cols-[440px_1fr] lg:gap-16">
          <div>
            <p className="landing-eyebrow">Look back. See what&apos;s been recorded.</p>
            <h2 className="landing-h2 mt-4 text-ink">Progress is easier to review when the details are together.</h2>
            <p className="landing-lead mt-4 max-w-[440px] text-slate-600">Explore recorded cognitive activity results and weekly trends to understand what has been completed and how results have varied over time.</p>
            <div className="mt-8 border-t border-slate-300/80">
              {progressSeries.map((s) => (
                <div key={s.label} className="flex items-center justify-between border-b border-slate-300/80 py-4">
                  <span className="flex items-center gap-3 text-[15px] text-ink"><svg width="26" height="4" aria-hidden><line x1="1" y1="2" x2="25" y2="2" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash ? (s.dash === "9 7" ? "6 3" : "2 3") : undefined} strokeLinecap="round" /></svg>{s.label}</span>
                  <span className="font-display text-[22px] text-ink">{s.value}</span>
                </div>
              ))}
            </div>
            <p className="landing-body mt-5 text-ink">A clearer record for caregivers. More context for conversations with healthcare professionals.</p>
            <p className="mt-3 text-[13px] leading-[1.55] text-slate-600">Activity scores are tracking information, not a diagnosis or a measure of disease progression.</p>
          </div>
          <div className="reveal-item card-glow">
          <div className="app-preview rounded-[1.75rem] border border-border bg-white p-5 shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl text-ink">Weekly activity results</h3>
              <div className="flex items-center gap-3"><SampleChip /><Link href="/dashboard" className="text-xs text-accent-ink underline underline-offset-2 hover:text-navy">View full report →</Link></div>
            </div>
            <ProgressChart />
          </div>
          </div>
        </RevealGroup>
      </section>

      {/* ───────────── Daily routine ───────────── */}
      <section className="section-padding bg-section-offwhite py-16 lg:py-20">
        <RevealGroup className="container-neura grid items-center gap-12 lg:grid-cols-[minmax(0,776px)_1fr] lg:gap-[72px]">
          <div className="reveal-item card-glow card-glow-alt">
          <div className="app-preview on-dark rounded-[1.75rem] bg-navy p-6 text-white shadow-[0_40px_70px_-36px_rgba(31,37,92,0.65)] sm:p-8">
            <div className="flex items-center justify-between"><h3 className="text-[1.65rem] text-white">Today&apos;s care</h3><span className="text-[13px] text-white/70">{SAMPLE_TODAY}</span></div>
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
          </div>
          <div>
            <p className="landing-eyebrow">One day, made easier to follow</p>
            <h2 className="landing-h2 mt-4 text-ink">Know what&apos;s done. See what&apos;s next.</h2>
            <p className="landing-lead mt-4 max-w-[440px] text-slate-600">Keep scheduled medication and activities organized throughout the day. Update task status as you go, and use the same view to see what still needs attention.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Next up" title="Lunch Medication" detail="1:00 PM" />
              <MiniStat label="Done today" title="2 of 4 tasks" detail="Medication & exercise" />
            </div>
          </div>
        </RevealGroup>
      </section>

      {/* ───────────── Designed around caregiving ───────────── */}
      <section className="section-padding bg-section-sage py-16 lg:py-20">
        <div className="container-neura">
          <div className="mx-auto max-w-[680px] text-center">
            <p className="landing-eyebrow">Designed around caregiving</p>
            <h2 className="landing-h2 mt-4 text-ink">Made for the realities of everyday care.</h2>
            <p className="landing-lead mt-4 text-slate-600">Caregiving involves many small tasks, observations, and decisions. Neura brings the practical details together in a workspace designed to feel clear, calm, and manageable.</p>
          </div>
          <RevealGroup className="mt-14 grid items-start gap-5 lg:grid-cols-3">
            {benefits.map((b, i) => {
              const Glyph = benefitGlyphs[i] ?? Burst;
              const featured = i === 1;
              return (
                <div key={b.title} className={cn("reveal-item", featured && "lg:mt-12")}>
                  <div
                    className={cn(
                      "group rounded-[1.75rem] p-7 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 sm:p-8",
                      featured
                        ? "on-dark bg-navy text-white shadow-[0_34px_60px_-30px_rgba(31,37,92,0.6)] hover:shadow-[0_44px_70px_-30px_rgba(31,37,92,0.7)]"
                        : "bg-white shadow-[0_24px_50px_-34px_rgba(31,37,92,0.3)] hover:shadow-[0_34px_60px_-30px_rgba(31,37,92,0.38)]",
                    )}
                  >
                    <Glyph className={cn("size-[18px] transition-transform duration-500 ease-out group-hover:rotate-[20deg] group-hover:scale-110", featured ? "text-blue-300" : i === 0 ? "text-blue-500" : "text-accent-ink")} />
                    <h3 className={cn("landing-h3 mt-5", featured ? "text-white" : "text-ink")}>{b.title}</h3>
                    <p className={cn("landing-body mt-3", featured ? "text-white/80" : "text-slate-600")}>{b.description}</p>
                  </div>
                </div>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section id="faq" className="section-padding scroll-mt-16 bg-section-offwhite pb-24 pt-16 lg:scroll-mt-[72px] lg:pb-28 lg:pt-20">
        <div className="container-neura grid gap-10 lg:grid-cols-[500px_1fr] lg:gap-0">
          <div>
            <p className="landing-eyebrow">Good to know</p>
            <h2 className="landing-h2 mt-4 max-w-[420px] text-ink">Common questions about Neura.</h2>
          </div>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      {/* ───────────── Closing CTA ───────────── */}
      <section className="on-dark grid bg-navy lg:grid-cols-2">
        <div aria-hidden className="relative h-64 overflow-hidden bg-navy-deep sm:h-80 lg:h-auto lg:min-h-[460px]">
          <GlowWave className="absolute inset-0 size-full" />
        </div>
        <div className="flex flex-col justify-center px-6 py-16 text-white sm:px-14 lg:py-20">
          <p className="landing-eyebrow">Start with the everyday</p>
          <h2 className="landing-h2 mt-4 max-w-[540px] text-white"><em>A little more clarity</em> for the care you give every day.</h2>
          <p className="landing-lead mt-6 max-w-[440px] text-white/80">Bring daily routines, cognitive activities, and care observations into one place with Neura.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" className="h-12 w-fit pl-6 pr-4 text-[15px] font-semibold focus-visible:ring-offset-navy"><Link href="/signup">Create caregiver account <ArrowBubble /></Link></Button>
            <Button asChild variant="ghost" className="h-12 border border-white/30 px-6 text-[15px] text-white/90 hover:border-white/50 hover:bg-white/[0.07] hover:text-white focus-visible:ring-offset-navy"><a href="#features">Explore features</a></Button>
          </div>
          <p className="mt-6 max-w-[440px] text-[13px] leading-[1.55] text-white/65">Neura supports caregiving. It does not replace professional medical advice.</p>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="section-padding bg-navy py-8 text-white">
        <div className="container-neura flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-1.5 md:items-start">
            <Logo tone="light" textClassName="text-[1.35rem]" />
            <p className="text-[13px] text-white/70">Cognitive support for everyday dementia care.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-7 text-[14px] text-white/80">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
            <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
          </nav>
          <p className="text-[13px] text-white/70">© 2026 Neura. Not a substitute for medical advice.</p>
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
    <div className="reveal-item rounded-2xl border border-border bg-white px-5 py-5">
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
