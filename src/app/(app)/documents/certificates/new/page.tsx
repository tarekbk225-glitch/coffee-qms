import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { NewCertificateForm } from "./new-certificate-form";

export default async function NewCertificatePage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const orgId = session!.activeOrgId!;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, name_ar")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name_ar");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="شهادة / ترخيص رسمي جديد" description="مثل شهادة الصلاحية البلدية، الشهادة الصحية، أو أي ترخيص آخر" />
      <NewCertificateForm sites={sites ?? []} />
    </div>
  );
}
