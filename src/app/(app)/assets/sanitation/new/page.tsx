import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { NewStationForm } from "./new-station-form";

export default async function NewStationPage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const orgId = session!.activeOrgId!;

  const [{ data: sites }, { data: departments }, { data: areas }] = await Promise.all([
    supabase.from("sites").select("id, name, name_ar").eq("organization_id", orgId).eq("is_active", true).order("name_ar"),
    supabase.from("departments").select("id, name, name_ar, site_id").eq("organization_id", orgId).order("name_ar"),
    supabase.from("areas").select("id, name, name_ar, site_id").eq("organization_id", orgId).order("name_ar"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="محطة نظافة / مكافحة حشرات جديدة" description="سجّل بيانات المحطة، وسيتم توليد رمز QR الخاص بها تلقائيًا" />
      {!sites || sites.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          لا توجد مواقع نشطة بعد. أضف موقعًا من الإعدادات أولاً.
        </p>
      ) : (
        <NewStationForm sites={sites} departments={departments ?? []} areas={areas ?? []} />
      )}
    </div>
  );
}
