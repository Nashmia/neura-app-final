"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { sidebarItems } from "@/lib/frontend-data";
import { cn } from "@/lib/utils";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <nav className="space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition",
                active ? "bg-periwinkle font-medium text-navy" : "text-white/75 hover:bg-white/[0.07] hover:text-white"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[1.25rem] border border-white/10 bg-white/[0.05] p-5">
        <h3 className="text-lg text-white">Care workspace</h3>
        <p className="mt-1.5 text-[13px] leading-5 text-white/65">Review progress, update medicines, and start patient-friendly quizzes.</p>
        <button onClick={logout} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-periwinkle text-sm font-medium text-navy transition hover:bg-[#9dadff]">
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </div>
  );
}

/** Navy sidebar on large screens; a top bar with a slide-in menu on smaller ones. */
export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-navy px-5 pb-5 pt-7 lg:flex">
        <Logo tone="light" className="mb-9 px-2" />
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-navy px-4 lg:hidden">
        <Logo tone="light" textClassName="text-[1.4rem]" />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10"><Menu className="size-5" /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy-deep/60 backdrop-blur-sm" />
          <div className="animate-rise absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-navy px-5 pb-5 pt-5">
            <div className="mb-7 flex items-center justify-between px-2">
              <Logo tone="light" textClassName="text-[1.4rem]" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-full text-white hover:bg-white/10"><X className="size-5" /></button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
