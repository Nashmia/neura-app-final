"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Staggered fade-and-rise for a group of children the first time the group
 * scrolls into view. Server HTML renders the content fully visible; the hidden
 * start state is only applied after hydration, and only if the group is still
 * below the fold, so content never disappears if JavaScript is slow or off.
 * Styling lives in globals.css (`.reveal-group`), including reduced-motion.
 */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "armed" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (e.g. after an anchor jump): leave it as rendered.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal={state} className={cn("reveal-group", className)}>
      {children}
    </div>
  );
}
