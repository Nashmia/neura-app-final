"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/** Small-screen disclosure menu for the landing header. */
export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item =
    "flex min-h-12 items-center rounded-xl px-3 text-[16px] font-medium text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="landing-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="-mr-2 grid size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <nav
        id="landing-mobile-nav"
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full -mx-4 border-t border-white/10 bg-navy px-4 pb-5 pt-2 shadow-[0_24px_40px_-24px_rgba(0,0,0,0.6)] sm:-mx-6 sm:px-6"
      >
        <ul className="space-y-0.5">
          {links.map((link) => (
            <li key={link.href}><a href={link.href} onClick={close} className={item}>{link.label}</a></li>
          ))}
          <li className="mt-2 border-t border-white/10 pt-2"><Link href="/login" onClick={close} className={item}>Sign in</Link></li>
        </ul>
      </nav>
    </div>
  );
}
