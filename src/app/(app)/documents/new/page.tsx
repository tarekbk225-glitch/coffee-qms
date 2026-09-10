import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { NewDocumentForm } from "./new-document-form";

export default async function NewDocumentPage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const orgId = session!.activeOrgId!;

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, name_ar")
    .eq("organization_id", orgId)
    .order("name_ar");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="مستند جديد" description="سياسة، إجراء تشغيل قياسي، مواصفة أو أي مستند خاضع للرقابة" />
      <NewDocumentForm departments={departments ?? []} />
    </div>
  );
}
