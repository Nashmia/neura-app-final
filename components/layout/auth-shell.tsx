import { GlowWave } from "@/components/layout/glow-wave";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

/** Split layout for sign-in pages: navy brand panel on the left (large screens), the form card on the right. */
export function AuthShell({ tagline, wide = false, children }: { tagline: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="on-dark relative hidden overflow-hidden bg-navy-deep text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <GlowWave id="auth-wave" className="absolute inset-x-0 top-[18%] h-[62%] w-full" />
        <Logo tone="light" className="relative" />
        <div className="relative max-w-md">
          <p className="kicker text-white/70">Care, with more clarity</p>
          <h2 className="mt-3 text-[2.75rem] leading-[1.08] text-[#f1f2fb]">Be there for the moments <em>that matter</em>.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">{tagline}</p>
        </div>
      </aside>
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className={cn("animate-rise w-full", wide ? "max-w-xl" : "max-w-md")}>
          <div className="mb-8 lg:hidden">
            <Logo />
            <p className="mt-2 text-sm text-slate-600">{tagline}</p>
          </div>
          <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-[0_30px_60px_-36px_rgba(31,37,92,0.3)] sm:p-9">{children}</div>
        </div>
      </div>
    </main>
  );
}
