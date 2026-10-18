import { AlertCircle, Check } from "lucide-react";

export type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; message: string } | { kind: "error"; message: string };

/** Inline result of a save, announced to screen readers. Success only appears after the server confirms. */
export function SaveStatus({ status }: { status: Status }) {
  return (
    <p role="status" aria-live="polite" className="min-h-5 text-sm">
      {status.kind === "saved" && <span className="inline-flex items-center gap-1.5 font-medium text-accent-ink"><Check className="size-4" />{status.message}</span>}
      {status.kind === "error" && <span className="inline-flex items-start gap-1.5 font-medium text-red-600"><AlertCircle className="mt-0.5 size-4 shrink-0" />{status.message}</span>}
    </p>
  );
}
