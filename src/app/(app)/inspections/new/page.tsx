import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { ScheduleInspectionForm } from "./schedule-form";

export default async function NewInspectionPage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const orgId = session!.activeOrgId!;

  const [{ data: templates }, { data: sites }, { data: departments }, { data: areas }, { data: members }] = await Promise.all([
    supabase.from("templates").select("id, name, name_ar, code").eq("organization_id", orgId).eq("status", "published").order("name_ar"),
    supabase.from("sites").select("id, name, name_ar").eq("organization_id", orgId).eq("is_active", true).order("name_ar"),
    supabase.from("departments").select("id, name, name_ar, site_id").eq("organization_id", orgId).order("name_ar"),
    supabase.from("areas").select("id, name, name_ar, site_id").eq("organization_id", orgId).order("name_ar"),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name, full_name_ar)")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  const inspectors = (members ?? [])
    .map((m) => ({
      id: m.user_id,
      name: (m.profiles as unknown as { full_name: string; full_name_ar: string | null } | null)?.full_name_ar ||
        (m.profiles as unknown as { full_name: string } | null)?.full_name ||
        "—",
    }))
    .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="جدولة تفتيش جديد" description="اختر القالب المنشور والموقع والمفتش المسؤول" />
      {!templates || templates.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          لا توجد قوالب منشورة بعد. انشر قالبًا أولاً من صفحة قوالب التفتيش.
        </p>
      ) : (
        <ScheduleInspectionForm
          templates={templates}
          sites={sites ?? []}
          departments={departments ?? []}
          areas={areas ?? []}
          inspectors={inspectors}
        />
      )}
    </div>
  );
}
