import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  A floating feature card from the landing hero artwork, rendered as real
  HTML so its text and icon stay crisp at any size or pixel density.

  Placement: `x`/`y` are the card centre as percentages of the artwork frame,
  `rotate` is its tilt in degrees. `mobileX`/`mobileY` optionally override the
  anchor below 640px, where cards are relatively larger and must not clip the
  frame edge or cover the caption.
  Sizing and the float animation live in globals.css (`.hero-card*`).
*/

export type HeroCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  mobileX?: number;
  mobileY?: number;
  rotate: number;
  tone?: "light" | "lavender";
  /** Float cycle, so the three cards never move in step. */
  float: { duration: number; delay: number; distance: number };
};

export function HeroCard({ icon, title, subtitle, x, y, mobileX, mobileY, rotate, tone = "light", float }: HeroCardProps) {
  const style = {
    "--card-x": `${x}%`,
    "--card-x-mobile": `${mobileX ?? x}%`,
    "--card-y": `${y}%`,
    "--card-y-mobile": `${mobileY ?? y}%`,
    "--card-rotate": `${rotate}deg`,
    "--float-duration": `${float.duration}s`,
    "--float-delay": `${float.delay}s`,
    "--float-distance": `${-float.distance}px`,
  } as CSSProperties;

  return (
    <div className="hero-card" style={style}>
      <div
        className={cn(
          "hero-card-float flex flex-col rounded-[1.6em] border px-[0.95em] pb-[0.9em] pt-[0.85em] sm:aspect-square",
          tone === "lavender" ? "hero-card-lavender text-navy" : "hero-card-light text-[#262a3f]",
        )}
      >
        <span className="-ml-[0.2em] flex h-[2.2em] items-center sm:h-[2.5em]">{icon}</span>
        <span className="mt-[0.6em] whitespace-nowrap text-[0.96em] font-medium leading-tight tracking-[-0.01em] sm:mt-auto">{title}</span>
        <span className="mt-[0.3em] flex items-center justify-between gap-[0.5em] whitespace-nowrap text-[0.86em] leading-tight">
          <span className={tone === "lavender" ? "text-[#424878]" : "text-[#4f5368]"}>{subtitle}</span>
          <ArrowRight className="size-[1.15em] shrink-0" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

/** The two-tone capsule from the original artwork (no matching library icon). */
export function PillIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g transform="rotate(-45 12 12)">
        <rect x="1.5" y="7" width="21" height="10" rx="5" fill="#e0794a" stroke="#2b2b33" strokeWidth="1.3" />
        <rect x="2.7" y="8.2" width="9.3" height="7.6" rx="3.8" fill="#c9603a" />
        <path d="M12 7v10" stroke="#2b2b33" strokeWidth="1.3" />
      </g>
    </svg>
  );
}
