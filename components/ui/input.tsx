import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn("flex h-12 w-full rounded-[12px] border border-input bg-white px-4 py-2 text-base text-ink transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-periwinkle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-periwinkle/25 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70", className)}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
export { Input };
