"use client";

import { Cpu, Loader2 } from "lucide-react";
import { MODEL_INFO, useModelStatus } from "@/lib/ml/client";
import type { MlModel } from "@/lib/ml/protocol";
import { cn } from "@/lib/utils";

/** Small label showing an on-device model's state: downloading (with progress), ready, or unavailable. */
export function ModelBadge({ model, className }: { model: MlModel; className?: string }) {
  const { status, progress } = useModelStatus(model);
  if (status === "idle") return null;
  const info = MODEL_INFO[model];
  const text =
    status === "loading"
      ? `Downloading ${info.name} (${info.size}, once)… ${progress}%`
      : status === "ready"
        ? `${info.name} · runs on this device`
        : `${info.name} unavailable · using the standard version`;
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-[11px] text-slate-500", className)}>
      {status === "loading" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Cpu className="size-3" aria-hidden />}
      {text}
    </span>
  );
}
