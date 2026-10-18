import Link from "next/link";
import { cn } from "@/lib/utils";
import { NeuraLogo } from "@/components/brand/neura-logo";

/**
 * The Neura logo as a home link. `tone="light"` is for navy backgrounds.
 * The logo sizes from the font size, so `textClassName` (e.g. "text-[1.35rem]")
 * scales it. `animate` plays the one-time entrance (used in the landing header).
 */
export function Logo({ className, textClassName, tone = "dark", animate = false }: { className?: string; textClassName?: string; tone?: "dark" | "light"; animate?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center rounded-lg", className)} aria-label="Neura home">
      <NeuraLogo tone={tone} animate={animate} className={cn("text-[1.65rem]", textClassName)} />
    </Link>
  );
}
