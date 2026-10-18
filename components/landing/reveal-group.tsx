"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-triggered entrance for cards. Wrap a section's cards in one
 * <RevealGroup> and mark each card (at any depth) with the `reveal-item`
 * class. Each card fades in and rises ~24px the first time ~18% of it is
 * visible; cards that come into view together are staggered by STAGGER_MS in
 * document order. Every card animates once and then stays put.
 *
 * Safety:
 * - The server HTML is untouched, so cards are fully visible without JS and
 *   there is nothing to mismatch during hydration.
 * - Only cards still below the fold after hydration are hidden ("armed"), so
 *   nothing on screen at load flickers.
 * - Reduced motion, no IntersectionObserver, or any error: nothing is hidden.
 * - The reveal state lives on the DOM nodes, not in React state, so re-renders
 *   cannot replay it. Transition styles are removed once a card has settled,
 *   so they never interfere with the card's own hover transitions.
 * Styles: `[data-reveal]` rules in globals.css. The wrapper renders a plain
 * <div>, so pass the original container's className to keep the layout.
 */
const STAGGER_MS = 120;
const DURATION_MS = 650;

export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = [...root.querySelectorAll<HTMLElement>(".reveal-item")];
    const armed = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    if (!armed.length) return;

    const timers: number[] = [];
    const settle = (el: HTMLElement) => {
      delete el.dataset.reveal;
      el.style.removeProperty("--reveal-delay");
    };
    const show = (el: HTMLElement, delay: number) => {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.reveal = "shown";
      timers.push(window.setTimeout(() => settle(el), delay + DURATION_MS + 80));
    };

    let io: IntersectionObserver | undefined;
    try {
      armed.forEach((el) => (el.dataset.reveal = "armed"));
      io = new IntersectionObserver(
        (entries) => {
          const entering = entries
            .filter((e) => e.isIntersecting)
            .map((e) => e.target as HTMLElement)
            .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
          entering.forEach((el, i) => {
            io?.unobserve(el);
            show(el, i * STAGGER_MS);
          });
        },
        { threshold: 0.18 },
      );
      armed.forEach((el) => io!.observe(el));
    } catch {
      armed.forEach(settle);
    }

    return () => {
      io?.disconnect();
      timers.forEach(clearTimeout);
      // Never leave a card hidden if this unmounts mid-way.
      items.forEach(settle);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
