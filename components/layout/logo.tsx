import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Neura logo: a periwinkle badge holding a flowing "N" drawn as a neural
 * pathway (the original wave, now joining connection nodes), next to the name
 * in the display serif. `tone="light"` is for navy backgrounds.
 *
 * Solid fills only, no SVG gradients: gradient ids would be duplicated across
 * the several logos on a page, and break when the first one is hidden.
 */
export function Logo({ className, textClassName, tone = "dark" }: { className?: string; textClassName?: string; tone?: "dark" | "light" }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Neura home">
      <svg
        viewBox="0 0 32 32"
        aria-hidden
        className="size-[30px] shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-105"
      >
        {/* Badge, with a soft highlight and a lighter inner ring */}
        <rect x="1" y="1" width="30" height="30" rx="10" fill="#8ea0ff" />
        <path d="M11 1h10a10 10 0 0 1 10 10v.5C26 6 18 4.5 8.5 7.5 5.5 8.5 3 10 1 12v-1A10 10 0 0 1 11 1Z" fill="#fff" fillOpacity="0.22" />
        <rect x="1.75" y="1.75" width="28.5" height="28.5" rx="9.25" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1" />
        {/* The pathway: a smooth "N" from the lower-left node to the upper-right spark */}
        <path
          d="M9.2 22.2C8.8 16.5 9 12 10.8 10.6c2.4-1.9 4.6 3.5 6.6 7.4 1.9 3.8 4 6.3 5.2 4.2 1.1-2 .9-6.6.6-11.9"
          fill="none"
          stroke="#1f255c"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.2" cy="22.4" r="2.5" fill="#1f255c" />
        <circle cx="9.2" cy="22.4" r="1" fill="#fff" />
        <circle cx="16.1" cy="15.4" r="1.25" fill="#fff" />
        <circle cx="23.2" cy="10.2" r="4" fill="#fff" fillOpacity="0.35" />
        <circle cx="23.2" cy="10.2" r="2.5" fill="#fff" stroke="#1f255c" strokeWidth="1.4" />
      </svg>
      <span className={cn("font-display text-[1.65rem] leading-none tracking-tight", tone === "light" ? "text-white" : "text-ink", textClassName)}>Neura</span>
    </Link>
  );
}
