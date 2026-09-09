import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { templateStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { can } from "@/lib/permissions";

export default async function TemplatesPage() {
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, name_ar, code, category, status, version, updated_at, departments(name_ar, name)")
    .eq("organization_id", session!.activeOrgId!)
    .order("updated_at", { ascending: false });

  const canCreate = can(session!.permissions, PERMISSIONS.TEMPLATE_CREATE);

  return (
    <div>
      <PageHeader
        title="قوالب التفتيش"
        description="بناء وإدارة نماذج التفتيش القابلة لإعادة الاستخدام عبر المصنع"
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/templates/new">
                <Plus className="h-4 w-4" /> قالب جديد
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!templates || templates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد قوالب بعد"
          description="أنشئ أول قالب تفتيش لبدء استخدامه في جدولة عمليات التفتيش."
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href="/templates/new">إنشاء قالب</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرمز</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإصدار</TableHead>
                <TableHead>آخر تحديث</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/templates/${t.id}`} className="hover:underline">
                      {t.name_ar || t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">
                    {t.code}
                  </TableCell>
                  <TableCell>{(t.departments as unknown as { name_ar: string | null; name: string } | null)?.name_ar ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} label={templateStatusLabels[t.status].ar} />
                  </TableCell>
                  <TableCell>v{t.version}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
