import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.activeOrgId) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_top,_rgba(200,132,44,0.12),_transparent_55%)] px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          ق
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">مرحبًا {session.fullName || session.email}</p>
          <p className="text-xs text-muted-foreground">لنبدأ بإنشاء مصنعك الأول</p>
        </div>
      </div>
      <OnboardingForm />
    </div>
  );
}
