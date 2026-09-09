import Link from "next/link";
import { Boxes, Plus, QrCode } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { can, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assetStatusLabels, assetCriticalityLabels } from "@/lib/labels";
import type { AssetStatus, AssetCriticality } from "@/types/database";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ status?: string; criticality?: string }> }) {
  const { status, criticality } = await searchParams;
  const session = await getSessionContext();
  const supabase = await createClient();

  let query = supabase
    .from("assets")
    .select("id, asset_code, name, name_ar, category, status, criticality, qr_code_token, site:sites(name, name_ar), area:areas(name, name_ar)")
    .eq("organization_id", session!.activeOrgId!)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status as AssetStatus);
  if (criticality) query = query.eq("criticality", criticality as AssetCriticality);

  const { data: assets } = await query;
  const canCreate = can(session!.permissions, PERMISSIONS.ASSET_CREATE);

  return (
    <div>
      <PageHeader
        title="سجل الأصول والمعدات"
        description="جميع المعدات المسجّلة مع رمز QR الخاص بها، جاهزة لربطها مستقبلًا بطلبات الصيانة"
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/assets/new">
                <Plus className="h-4 w-4" />
                أصل جديد
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!assets || assets.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="لا توجد أصول مسجّلة"
          description="أضف أول معدة أو أصل إلى السجل ليصبح جاهزًا للربط بالتفتيشات والصيانة مستقبلًا."
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href="/assets/new">إضافة أصل</Link>
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
                <TableHead>الفئة</TableHead>
                <TableHead>الموقع / المنطقة</TableHead>
                <TableHead>الأهمية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => {
                const site = a.site as unknown as { name: string; name_ar: string | null } | null;
                const area = a.area as unknown as { name: string; name_ar: string | null } | null;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link href={`/assets/${a.id}`} className="hover:underline">
                        {a.asset_code}
                      </Link>
                    </TableCell>
                    <TableCell>{a.name_ar || a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.category}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {site ? (site.name_ar || site.name) : "—"}
                      {area ? ` / ${area.name_ar || area.name}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.criticality === "critical" ? "destructive" : a.criticality === "high" ? "danger" : "neutral"
                        }
                      >
                        {assetCriticalityLabels[a.criticality].ar}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} label={assetStatusLabels[a.status].ar} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                        <QrCode className="h-3.5 w-3.5" />
                        {a.qr_code_token.slice(0, 8)}
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
