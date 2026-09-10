import Link from "next/link";
import { Bug, Plus, QrCode, ListChecks } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sanitationStationTypeLabels, sanitationStationStatusLabels } from "@/lib/labels";
import type { SanitationStationStatus, SanitationStationType } from "@/types/database";

export default async function SanitationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; station_type?: string }>;
}) {
  const { status, station_type } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("sanitation_stations")
    .select(
      "id, station_code, name, name_ar, station_type, status, target_pest, site:sites(name, name_ar), area:areas(name, name_ar)"
    )
    .eq("organization_id", session!.activeOrgId!)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status as SanitationStationStatus);
  if (station_type) query = query.eq("station_type", station_type as SanitationStationType);

  const { data: stations } = await query;
  const canCreate = can(session!.permissions, PERMISSIONS.PEST_CONTROL_MANAGE);

  return (
    <div>
      <PageHeader
        title="النظافة ومكافحة الحشرات"
        description="سجل محطات الطعم والمصائد ونقاط تفتيش النظافة، مع سجل الفحوصات الدورية لكل محطة"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/sanitation/checks">
                <ListChecks className="h-4 w-4" />
                سجل الفحوصات
              </Link>
            </Button>
            {canCreate && (
              <Button asChild>
                <Link href="/sanitation/new">
                  <Plus className="h-4 w-4" />
                  محطة جديدة
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {!stations || stations.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="لا توجد محطات مسجّلة"
          description="أضف أول محطة طعم أو مصيدة أو نقطة تفتيش نظافة ليصبح بالإمكان تسجيل فحوصات دورية عليها."
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href="/sanitation/new">إضافة محطة</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرمز</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الموقع / المنطقة</TableHead>
                <TableHead>الآفة المستهدفة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((s) => {
                const site = s.site as unknown as { name: string; name_ar: string | null } | null;
                const area = s.area as unknown as { name: string; name_ar: string | null } | null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link href={`/sanitation/${s.id}`} className="hover:underline">
                        {s.station_code}
                      </Link>
                    </TableCell>
                    <TableCell>{s.name_ar || s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{sanitationStationTypeLabels[s.station_type].ar}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {site ? (site.name_ar || site.name) : "—"}
                      {area ? ` / ${area.name_ar || area.name}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.target_pest || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} label={sanitationStationStatusLabels[s.status].ar} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                        <QrCode className="h-3.5 w-3.5" />
                      </span>
                    </TableCell>
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
