import { guard } from "@/lib/guard";
import { HistoryGuard } from "@/components/layout/history-guard";

// Server-side access check on every request; see lib/access.ts for the rules.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard("app", "/dashboard");
  return (
    <>
      <HistoryGuard />
      {children}
    </>
  );
}
