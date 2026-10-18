"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirectToLogin } from "@/lib/utils";

/**
 * Downloads the PDF care report. Fetching it (rather than a plain link) means a
 * failure shows a readable message with a retry, instead of a raw error page.
 */
export function ReportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/reports");
      if (r.status === 401) return redirectToLogin();
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "The report couldn't be generated.");
      }
      const blob = await r.blob();
      const name = /filename="?([^";]+)"?/.exec(r.headers.get("Content-Disposition") || "")?.[1] || "neura-care-report.pdf";
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server.";
      setError(`${message} Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={download} disabled={busy} className="h-12 w-full bg-white">
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileDown className="mr-2 size-4" />}
        {busy ? "Preparing report..." : "Download care report"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
