import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/session";

export default async function RootPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/onboarding");
  redirect("/dashboard");
}
