"use client";

import { useEffect } from "react";

/**
 * Browsers can restore a page from their back/forward cache without asking the
 * server, so after logging out, pressing Back could show a patient's data
 * again. When a protected page comes back that way, hide it and reload: the
 * server-side guard then sends a signed-out visitor to login, and a signed-in
 * one simply gets fresh data.
 */
export function HistoryGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      document.documentElement.style.visibility = "hidden";
      window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
