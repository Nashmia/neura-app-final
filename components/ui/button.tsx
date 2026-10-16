import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgba(31,37,92,0.6)] hover:bg-[var(--primary-hover)]",
        accent: "bg-periwinkle text-navy hover:bg-[#9dadff]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-700",
        outline: "border border-border bg-white text-ink hover:border-blue-300 hover:bg-blue-50",
        secondary: "bg-lavender text-navy hover:bg-blue-200",
        ghost: "text-slate-700 hover:bg-white/70 hover:text-ink",
        link: "text-accent-ink underline underline-offset-4 hover:text-navy",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3.5",
        lg: "h-12 px-7 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

/** The small light circle with an ↗ arrow that sits at the end of navy pill buttons in the design. */
function ArrowBubble({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("-mr-3 ml-1 grid size-8 place-items-center rounded-full bg-[#eceef2] text-navy", className)}>
      <svg viewBox="0 0 12 12" className="size-3" fill="none"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export { Button, buttonVariants, ArrowBubble };
