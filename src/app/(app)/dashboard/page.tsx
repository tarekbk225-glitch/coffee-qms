import Link from "next/link";
import {
  ClipboardCheck,
  AlarmClockOff,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { formatPercent, daysAgoIso } from "@/lib/format";
import { DashboardCharts } from "./dashboard-charts";

interface KpiCardProps {
  title: string;
  value: string;
  href: string;
  icon: React.ElementType;
  tone?: "default" | "warning" | "critical";
}

function KpiCard({ title, value, href, icon: Icon, tone = "default" }: KpiCardProps) {
  const toneClasses =
    tone === "critical"
      ? "text-[#d03b3b]"
      : tone === "warning"
        ? "text-[#c98500]"
        : "text-accent";
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className={`h-4 w-4 ${toneClasses}`} />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSessionContext();
  const supabase = await createClient();
  const orgId = session!.activeOrgId!;
  const today = new Date().toISOString().slice(0, 10);
  const startOfWeek = daysAgoIso(7);
  const last30 = daysAgoIso(30);
  const last14Days = daysAgoIso(14).slice(0, 10);

  const [
    { count: inspectionsToday },
    { count: inspectionsCompleted },
    { count: inspectionsOverdue },
    { data: complianceRows },
    { count: findingsOpen },
    { count: findingsCritical },
    { count: capasOpen },
    { count: capasOverdue },
    { data: findingsForCharts },
    { data: capasForCharts },
  ] = await Promise.all([
    supabase.from("inspections").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("scheduled_date", today),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("completed_at", startOfWeek)
      .in("status", ["completed", "submitted", "under_review", "approved", "closed"]),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .lt("scheduled_date", today),
    supabase
      .from("inspections")
      .select("compliance_percent, completed_at")
      .eq("organization_id", orgId)
      .gte("completed_at", last30)
      .not("compliance_percent", "is", null),
    supabase
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .not("status", "in", "(closed,rejected)"),
    supabase
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("severity", "critical")
      .not("status", "in", "(closed,rejected)"),
    supabase.from("capas").select("id", { count: "exact", head: true }).eq("organization_id", orgId).not("status", "in", "(closed,rejected)"),
    supabase
      .from("capas")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .lt("due_date", today)
      .not("status", "in", "(closed,rejected)"),
    supabase
      .from("findings")
      .select("severity, department_id, question_snapshot, status, created_at, departments(name_ar, name)")
      .eq("organization_id", orgId)
      .gte("created_at", last30),
    supabase.from("capas").select("status, created_at").eq("organization_id", orgId).gte("created_at", last30),
  ]);

  const complianceAvg =
    complianceRows && complianceRows.length > 0
      ? complianceRows.reduce((sum, r) => sum + (r.compliance_percent ?? 0), 0) / complianceRows.length
      : null;

  // Compliance trend: average compliance_percent per day, last 14 days
  const trendMap = new Map<string, { total: number; count: number }>();
  complianceRows?.forEach((r) => {
    if (!r.completed_at) return;
    const day = r.completed_at.slice(0, 10);
    if (day < last14Days) return;
    const cur = trendMap.get(day) ?? { total: 0, count: 0 };
    cur.total += r.compliance_percent ?? 0;
    cur.count += 1;
    trendMap.set(day, cur);
  });
  const complianceTrend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, value: Math.round((v.total / v.count) * 10) / 10 }));

  const severityCount = { low: 0, medium: 0, high: 0, critical: 0 } as Record<string, number>;
  const deptCount = new Map<string, number>();
  const failureCount = new Map<string, number>();
  (findingsForCharts as unknown as Array<{ severity: string; question_snapshot: string | null; departments: { name_ar: string | null; name: string } | null }> | null)?.forEach((f) => {
    severityCount[f.severity] = (severityCount[f.severity] ?? 0) + 1;
    const deptName = f.departments?.name_ar || f.departments?.name || "غير محدد";
    deptCount.set(deptName, (deptCount.get(deptName) ?? 0) + 1);
    if (f.question_snapshot) {
      failureCount.set(f.question_snapshot, (failureCount.get(f.question_snapshot) ?? 0) + 1);
    }
  });

  const findingsBySeverity = [
    { name: "منخفضة", key: "low", value: severityCount.low },
    { name: "متوسطة", key: "medium", value: severityCount.medium },
    { name: "عالية", key: "high", value: severityCount.high },
    { name: "حرجة", key: "critical", value: severityCount.critical },
  ];
  const findingsByDepartment = [...deptCount.entries()].map(([name, value]) => ({ name, value }));
  const topFailures = [...failureCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const capaStatusCount = { closed: 0, open: 0 } as Record<string, number>;
  capasForCharts?.forEach((c) => {
    if (c.status === "closed") capaStatusCount.closed += 1;
    else if (c.status !== "rejected") capaStatusCount.open += 1;
  });
  const capaTotal = capaStatusCount.closed + capaStatusCount.open;
  const capaClosureRate = capaTotal > 0 ? Math.round((capaStatusCount.closed / capaTotal) * 100) : null;

  return (
    <div>
      <PageHeader title="لوحة التحكم" description="نظرة شاملة على الجودة والعمليات في مصنعك" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard title="تفتيشات اليوم" value={String(inspectionsToday ?? 0)} href="/inspections?scope=today" icon={CalendarClock} />
        <KpiCard title="تفتيشات مكتملة (٧ أيام)" value={String(inspectionsCompleted ?? 0)} href="/inspections?scope=completed_week" icon={CheckCircle2} />
        <KpiCard title="تفتيشات متأخرة" value={String(inspectionsOverdue ?? 0)} href="/inspections?scope=overdue" icon={AlarmClockOff} tone={inspectionsOverdue ? "warning" : "default"} />
        <KpiCard title="نسبة الالتزام (٣٠ يوم)" value={formatPercent(complianceAvg)} href="/inspections?scope=completed_week" icon={Gauge} />
        <KpiCard title="ملاحظات مفتوحة" value={String(findingsOpen ?? 0)} href="/findings?status=open" icon={AlertTriangle} />
        <KpiCard title="ملاحظات حرجة" value={String(findingsCritical ?? 0)} href="/findings?severity=critical" icon={ShieldAlert} tone={findingsCritical ? "critical" : "default"} />
        <KpiCard title="إجراءات تصحيحية مفتوحة" value={String(capasOpen ?? 0)} href="/capas?scope=open" icon={Wrench} />
        <KpiCard title="إجراءات متأخرة" value={String(capasOverdue ?? 0)} href="/capas?scope=overdue" icon={ClipboardCheck} tone={capasOverdue ? "warning" : "default"} />
      </div>

      <DashboardCharts
        complianceTrend={complianceTrend}
        findingsBySeverity={findingsBySeverity}
        findingsByDepartment={findingsByDepartment}
        topFailures={topFailures}
        capaClosureRate={capaClosureRate}
        capaOpen={capaStatusCount.open}
        capaClosed={capaStatusCount.closed}
      />
    </div>
  );
}
