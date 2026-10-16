import Link from "next/link";
import { cn } from "@/lib/utils";

/** Neura wordmark: a periwinkle wave and the name in the display serif. `tone="light"` is for navy backgrounds. */
export function Logo({ className, textClassName, tone = "dark" }: { className?: string; textClassName?: string; tone?: "dark" | "light" }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Neura home">
      <svg viewBox="0 0 44 24" fill="none" aria-hidden className="h-[18px] w-[34px] shrink-0 text-periwinkle transition-transform duration-300 group-hover:translate-x-0.5">
        <path d="M3 17C8 6 13 4 17.5 10.5S27 19 31.5 11 38.5 4 41 6" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      </svg>
      <span className={cn("font-display text-[1.65rem] leading-none tracking-tight", tone === "light" ? "text-white" : "text-ink", textClassName)}>Neura</span>
    </Link>
  );
}
