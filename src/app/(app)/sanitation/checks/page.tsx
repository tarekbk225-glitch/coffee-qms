import Link from "next/link";
import { ListChecks } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pestActivityLevelLabels, sanitationConditionLabels, badgeToneForPestActivity, badgeToneForStatus } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { PestActivityLevel } from "@/types/database";

export default async function SanitationChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ activity_level?: string }>;
}) {
  const { activity_level } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("sanitation_checks")
    .select(
      "id, check_number, checked_at, activity_level, pest_type_observed, cleanliness_status, station:sanitation_stations(id, station_code, name, name_ar), checker:profiles(full_name, full_name_ar)"
    )
    .eq("organization_id", session!.activeOrgId!)
    .order("checked_at", { ascending: false })
    .limit(200);

  if (activity_level) query = query.eq("activity_level", activity_level as PestActivityLevel);

  const { data: checks } = await query;

  return (
    <div>
      <PageHeader title="سجل فحوصات النظافة ومكافحة الحشرات" description="جميع الفحوصات المسجّلة عبر كل محطات النظافة ومكافحة الحشرات" />

      {!checks || checks.length === 0 ? (
        <EmptyState icon={ListChecks} title="لا توجد فحوصات مسجّلة" description="ستظهر هنا الفحوصات فور تسجيلها من صفحة كل محطة." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>المحطة</TableHead>
                <TableHead>النشاط</TableHead>
                <TableHead>النظافة</TableHead>
                <TableHead>النوع الملاحظ</TableHead>
                <TableHead>بواسطة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.map((c) => {
                const station = c.station as unknown as { id: string; station_code: string; name: string; name_ar: string | null } | null;
                const checker = c.checker as unknown as { full_name: string; full_name_ar: string | null } | null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" dir="ltr">
                      {c.check_number}
                    </TableCell>
                    <TableCell>
                      {station ? (
                        <Link href={`/sanitation/${station.id}`} className="hover:underline">
                          {station.name_ar || station.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeToneForPestActivity(c.activity_level)}>{pestActivityLevelLabels[c.activity_level].ar}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.cleanliness_status ? (
                        <Badge variant={badgeToneForStatus(c.cleanliness_status)}>{sanitationConditionLabels[c.cleanliness_status].ar}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.pest_type_observed || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{checker?.full_name_ar || checker?.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(c.checked_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
