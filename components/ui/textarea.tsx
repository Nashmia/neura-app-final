import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn("flex min-h-[120px] w-full rounded-[12px] border border-input bg-white px-4 py-3 text-base text-ink transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25 disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
export { Textarea };
