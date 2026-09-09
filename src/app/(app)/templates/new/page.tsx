import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { NewTemplateForm } from "./new-template-form";

export default async function NewTemplatePage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, name_ar")
    .eq("organization_id", session!.activeOrgId!)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="قالب تفتيش جديد" description="أدخل البيانات الأساسية، ثم أضف الأقسام والأسئلة" />
      <NewTemplateForm departments={departments ?? []} />
    </div>
  );
}
