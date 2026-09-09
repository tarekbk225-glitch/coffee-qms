import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { NewAssetForm } from "./new-asset-form";

export default async function NewAssetPage() {
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
      <PageHeader title="أصل / معدة جديدة" description="سجّل بيانات المعدة، وسيتم توليد رمز QR الخاص بها تلقائيًا" />
      {!sites || sites.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          لا توجد مواقع نشطة بعد. أضف موقعًا من الإعدادات أولاً.
        </p>
      ) : (
        <NewAssetForm sites={sites} departments={departments ?? []} areas={areas ?? []} />
      )}
    </div>
  );
}
