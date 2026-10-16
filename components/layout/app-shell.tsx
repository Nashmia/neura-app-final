import { AppSidebar } from "@/components/layout/app-sidebar";

/**
 * Page frame for the signed-in app: the navy sidebar plus a page header with an
 * eyebrow label, a serif title (wrap an accent word in <em>) and optional actions.
 */
export function AppShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <AppSidebar />
      <section className="lg:pl-[264px]">
        <header className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 pb-2 pt-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-10 lg:pt-11">
          <div className="min-w-0">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1 className="mt-4 text-[2.1rem] leading-[1.1] text-ink sm:text-[2.6rem]">{title}</h1>
            {description && <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </section>
    </main>
  );
}
