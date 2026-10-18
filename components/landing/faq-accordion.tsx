"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Landing FAQ: one answer open at a time. Opening a question closes the
 * previous one, and clicking the open question closes it. Answers expand and
 * collapse smoothly (a grid-rows 0fr → 1fr transition, so no fixed heights).
 * Transitions are switched off under prefers-reduced-motion by globals.css.
 */
export function FaqAccordion({ items, defaultOpen = 0 }: { items: { question: string; answer: string }[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div
            key={item.question}
            className={cn(
              "border transition-[background-color,border-color,border-radius,box-shadow] duration-300 ease-out",
              isOpen
                ? "rounded-2xl border-border bg-white shadow-[0_20px_44px_-28px_rgba(31,37,92,0.35)]"
                : "rounded-none border-transparent border-b-slate-300/80 bg-transparent shadow-none",
            )}
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-6 text-left font-display text-[1.25rem] leading-snug transition-colors hover:text-accent-ink",
                  isOpen ? "text-ink" : "text-ink/90",
                )}
              >
                {item.question}
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 shrink-0 text-ink transition-transform duration-300 ease-out", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="landing-body -mt-2 max-w-[600px] px-6 pb-6 text-slate-600">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
