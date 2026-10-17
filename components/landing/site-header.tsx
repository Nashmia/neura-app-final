import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/landing/mobile-nav";

export const landingNavLinks = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const navLink =
  "rounded-full px-3.5 py-2 text-[14px] font-medium text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white active:bg-white/10 focus-visible:text-white";

/**
 * Landing-page header. Sticky; transparent over the hero, then a solid navy
 * bar (matching the footer) once the page scrolls. See `.landing-header`.
 */
export function SiteHeader() {
  return (
    <header className="landing-header on-dark section-padding sticky top-0 z-50 text-white">
      <div className="container-neura relative flex h-16 items-center lg:h-[72px]">
        <Logo tone="light" className="-ml-0.5 shrink-0" />

        <nav aria-label="Main" className="ml-10 hidden items-center gap-1 md:flex lg:ml-14">
          {landingNavLinks.map((link) => (
            <a key={link.href} href={link.href} className={navLink}>{link.label}</a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link href="/login" className={`${navLink} hidden md:inline-flex`}>Sign in</Link>
          <Button
            asChild
            variant="accent"
            className="h-10 px-5 text-[14px] font-semibold shadow-[0_8px_20px_-10px_rgba(142,160,255,0.7)] focus-visible:ring-offset-navy"
          >
            <Link href="/signup">
              <span className="lg:hidden">Create account</span>
              <span className="hidden lg:inline">Create caregiver account</span>
            </Link>
          </Button>
          <MobileNav links={landingNavLinks} />
        </div>
      </div>
    </header>
  );
}
