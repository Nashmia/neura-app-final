import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Animated Neura brand mark — a small "synapse" network inside a gradient tile.
 * The nodes pulse in sequence and a soft glow rotates behind the tile; the whole
 * mark lifts slightly on hover. Pure CSS animation (see globals.css), so it works
 * in both server and client components and respects prefers-reduced-motion.
 */
export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label="Neura home">
      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 shadow-lg shadow-teal-600/30 transition-transform duration-300 group-hover:scale-105">
        <span aria-hidden className="animate-spin-slow absolute -inset-2 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.45),transparent_40%)]" />
        <svg viewBox="0 0 32 32" fill="none" className="relative size-7 text-white" aria-hidden>
          <path d="M9 11 L16 8 L23 13 M9 11 L14 21 M23 13 L14 21 M16 8 L14 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.7" />
          <circle className="animate-node" cx="16" cy="8" r="2.6" fill="currentColor" />
          <circle className="animate-node anim-delay-2" cx="9" cy="11" r="2.2" fill="currentColor" />
          <circle className="animate-node anim-delay-3" cx="23" cy="13" r="2.2" fill="currentColor" />
          <circle className="animate-node anim-delay-4" cx="14" cy="21" r="2.4" fill="currentColor" />
        </svg>
      </span>
      <span className={cn("text-2xl font-extrabold tracking-tight text-slate-900", textClassName)}>
        Neura
      </span>
    </Link>
  );
}
