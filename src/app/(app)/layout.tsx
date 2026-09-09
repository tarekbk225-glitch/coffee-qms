import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/session";
import { SessionProvider } from "@/components/layout/session-provider";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/onboarding");

  return (
    <SessionProvider value={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
