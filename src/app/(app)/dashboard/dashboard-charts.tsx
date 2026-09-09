"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Validated palette (see dataviz skill references/palette.md) - status roles
// for severity, categorical slot 1 (blue) for neutral series.
const STATUS = {
  low: "#0ca30c",
  medium: "#fab219",
  high: "#ec835a",
  critical: "#d03b3b",
};
const SERIES_1 = "#2a78d6";

function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">لا توجد بيانات كافية بعد</p>
        ) : (
          <div className="h-52 w-full" dir="ltr">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({
  complianceTrend,
  findingsBySeverity,
  findingsByDepartment,
  topFailures,
  capaClosureRate,
  capaOpen,
  capaClosed,
}: {
  complianceTrend: { date: string; value: number }[];
  findingsBySeverity: { name: string; key: string; value: number }[];
  findingsByDepartment: { name: string; value: number }[];
  topFailures: { name: string; value: number }[];
  capaClosureRate: number | null;
  capaOpen: number;
  capaClosed: number;
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="اتجاه نسبة الالتزام (آخر ١٤ يوم)" empty={complianceTrend.length < 2}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={complianceTrend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, direction: "rtl" }}
              formatter={(v) => [`${v}%`, "نسبة الالتزام"]}
            />
            <Line type="monotone" dataKey="value" stroke={SERIES_1} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الملاحظات حسب الخطورة" empty={findingsBySeverity.every((d) => d.value === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={findingsBySeverity} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {findingsBySeverity.map((d) => (
                <Cell key={d.key} fill={STATUS[d.key as keyof typeof STATUS]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الملاحظات حسب القسم" empty={findingsByDepartment.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={findingsByDepartment} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={90} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="أكثر بنود الفشل تكرارًا" empty={topFailures.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topFailures} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={140}
              tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" fill={STATUS.high} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">معدل إغلاق الإجراءات التصحيحية (٣٠ يوم)</CardTitle>
        </CardHeader>
        <CardContent>
          {capaClosureRate === null ? (
            <p className="flex h-16 items-center justify-center text-sm text-muted-foreground">لا توجد بيانات كافية بعد</p>
          ) : (
            <div className="flex items-center gap-6">
              <p className="text-3xl font-bold tabular-nums text-accent">{capaClosureRate}%</p>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${capaClosureRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {capaClosed} مغلقة من أصل {capaOpen + capaClosed} إجراء خلال آخر ٣٠ يومًا
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
