"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { sidebarItems } from "@/lib/frontend-data";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-blue-100 bg-white/85 p-5 backdrop-blur-xl lg:block">
      <Logo className="mb-8" />

      <nav className="space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-600 hover:bg-blue-50 hover:text-primary"}`}>
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-5 right-5 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-5 text-white">
        <h3 className="font-semibold">Care workspace</h3>
        <p className="mt-2 text-sm leading-6 text-blue-50">Review progress, update medicines, and start patient-friendly quizzes.</p>
        <Button onClick={logout} className="mt-4 w-full rounded-2xl bg-white text-blue-700 hover:bg-blue-50">
          <LogOut className="mr-2 size-4" /> Logout
        </Button>
      </div>
    </aside>
  );
}
