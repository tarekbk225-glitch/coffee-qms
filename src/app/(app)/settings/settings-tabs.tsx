"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Info } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { siteTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import {
  updateOrganization,
  createSite,
  updateSite,
  createDepartment,
  updateDepartment,
  addMemberByEmail,
  updateMembership,
  removeMembership,
} from "./actions";
import type { Database } from "@/types/database";

type Org = { id: string; name: string; name_ar: string | null; slug: string };
type Site = Database["public"]["Tables"]["sites"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"] & {
  sites: { name: string; name_ar: string | null } | null;
};
type Membership = Database["public"]["Tables"]["memberships"]["Row"] & {
  profiles: { email: string; full_name: string; full_name_ar: string | null } | null;
  roles: { key: string; name: string; name_ar: string } | null;
  sites: { name: string; name_ar: string | null } | null;
};
type Role = { id: string; key: string; name: string; name_ar: string };

export function SettingsTabs({
  org,
  sites,
  departments,
  memberships,
  roles,
  canManageOrg,
  canManageSites,
  canManageUsers,
}: {
  org: Org;
  sites: Site[];
  departments: Department[];
  memberships: Membership[];
  roles: Role[];
  canManageOrg: boolean;
  canManageSites: boolean;
  canManageUsers: boolean;
}) {
  return (
    <Tabs defaultValue="org">
      <TabsList>
        <TabsTrigger value="org">المنظمة</TabsTrigger>
        <TabsTrigger value="sites">المواقع</TabsTrigger>
        <TabsTrigger value="departments">الأقسام</TabsTrigger>
        <TabsTrigger value="users">المستخدمون</TabsTrigger>
      </TabsList>

      <TabsContent value="org">
        <OrgTab org={org} canManage={canManageOrg} />
      </TabsContent>
      <TabsContent value="sites">
        <SitesTab sites={sites} canManage={canManageSites} />
      </TabsContent>
      <TabsContent value="departments">
        <DepartmentsTab departments={departments} sites={sites} canManage={canManageSites} />
      </TabsContent>
      <TabsContent value="users">
        <UsersTab memberships={memberships} sites={sites} roles={roles} canManage={canManageUsers} />
      </TabsContent>
    </Tabs>
  );
}

function OrgTab({ org, canManage }: { org: Org; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateOrganization(formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم حفظ بيانات المنظمة");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">بيانات المنظمة</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name_ar">الاسم (بالعربية)</Label>
              <Input id="name_ar" name="name_ar" defaultValue={org.name_ar ?? org.name} disabled={!canManage} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">الاسم بالإنجليزية</Label>
              <Input id="name" name="name" dir="ltr" defaultValue={org.name} disabled={!canManage} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>المعرّف (slug)</Label>
            <Input value={org.slug} dir="ltr" disabled className="text-muted-foreground" />
          </div>
          {canManage && (
            <div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function SitesTab({ sites, canManage }: { sites: Site[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function onCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createSite(formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم إنشاء الموقع");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function onUpdate(siteId: string, formData: FormData) {
    startTransition(async () => {
      const res = await updateSite(siteId, formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم الحفظ");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> موقع جديد
          </Button>
        </div>
      )}

      {showForm && canManage && (
        <Card>
          <CardContent className="pt-6">
            <form action={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input name="name_ar" placeholder="اسم الموقع (عربي)" required />
              <Input name="name" placeholder="Site name (English)" dir="ltr" />
              <Input name="code" placeholder="الرمز (مثال: MAIN-01)" dir="ltr" required />
              <Select name="type" defaultValue="factory">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(siteTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name="city" placeholder="المدينة (اختياري)" />
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "جارٍ الإنشاء..." : "إنشاء"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المدينة</TableHead>
              <TableHead>نشط</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((s) => (
              <SiteRow key={s.id} site={s} canManage={canManage} onSave={(fd) => onUpdate(s.id, fd)} isPending={isPending} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SiteRow({
  site,
  canManage,
  onSave,
  isPending,
}: {
  site: Site;
  canManage: boolean;
  onSave: (fd: FormData) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(site.name_ar ?? site.name);
  const [city, setCity] = useState(site.city ?? "");
  const [isActive, setIsActive] = useState(site.is_active);

  function submit() {
    const fd = new FormData();
    fd.set("name_ar", name);
    fd.set("city", city);
    if (isActive) fd.set("is_active", "on");
    onSave(fd);
  }

  return (
    <TableRow>
      <TableCell>
        {canManage ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={submit} className="h-8" />
        ) : (
          name
        )}
      </TableCell>
      <TableCell className="text-muted-foreground" dir="ltr">
        {site.code}
      </TableCell>
      <TableCell className="text-muted-foreground">{siteTypeLabels[site.type].ar}</TableCell>
      <TableCell>
        {canManage ? (
          <Input value={city} onChange={(e) => setCity(e.target.value)} onBlur={submit} className="h-8" placeholder="—" />
        ) : (
          city || "—"
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={isActive}
          disabled={!canManage || isPending}
          onCheckedChange={(v) => {
            setIsActive(v);
            const fd = new FormData();
            fd.set("name_ar", name);
            fd.set("city", city);
            if (v) fd.set("is_active", "on");
            onSave(fd);
          }}
        />
      </TableCell>
    </TableRow>
  );
}

function DepartmentsTab({
  departments,
  sites,
  canManage,
}: {
  departments: Department[];
  sites: Site[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function onCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createDepartment(formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تم إنشاء القسم");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function onToggleActive(deptId: string, name: string, isActive: boolean) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name_ar", name);
      if (isActive) fd.set("is_active", "on");
      const res = await updateDepartment(deptId, fd);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> قسم جديد
          </Button>
        </div>
      )}

      {showForm && canManage && (
        <Card>
          <CardContent className="pt-6">
            <form action={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input name="name_ar" placeholder="اسم القسم (عربي)" required />
              <Input name="name" placeholder="Department name (English)" dir="ltr" />
              <Select name="site_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموقع" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ar || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name="code" placeholder="الرمز (اختياري)" dir="ltr" />
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "جارٍ الإنشاء..." : "إنشاء"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>القسم</TableHead>
              <TableHead>الموقع</TableHead>
              <TableHead>نشط</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name_ar || d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.sites?.name_ar || d.sites?.name || "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={d.is_active}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => onToggleActive(d.id, d.name_ar || d.name, v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UsersTab({
  memberships,
  sites,
  roles,
  canManage,
}: {
  memberships: Membership[];
  sites: Site[];
  roles: Role[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function onAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addMemberByEmail(formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تمت إضافة العضو");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function onChangeRole(membershipId: string, roleId: string) {
    startTransition(async () => {
      const res = await updateMembership(membershipId, { role_id: roleId });
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function onToggleActive(membershipId: string, isActive: boolean) {
    startTransition(async () => {
      const res = await updateMembership(membershipId, { is_active: isActive });
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function onRemove(membershipId: string) {
    startTransition(async () => {
      const res = await removeMembership(membershipId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("تمت إزالة العضو");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> إضافة عضو
          </Button>
        </div>
      )}

      {showForm && canManage && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                يمكنك إضافة مستخدم لديه حساب بالفعل عبر بريده الإلكتروني. إنشاء حساب جديد نيابة عن موظف (دعوة عبر البريد
                الإلكتروني) وظيفة مستقبلية تتطلب صلاحيات إدارية إضافية على مزوّد الحسابات.
              </p>
            </div>
            <form action={onAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input name="email" type="email" placeholder="name@company.com" dir="ltr" required className="sm:col-span-1" />
              <Select name="role_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name_ar || r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="site_id">
                <SelectTrigger>
                  <SelectValue placeholder="كل المواقع (بدون تحديد)" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ar || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="sm:col-span-3">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "جارٍ الإضافة..." : "إضافة"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الموقع</TableHead>
              <TableHead>نشط</TableHead>
              <TableHead>انضم في</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.profiles?.full_name_ar || m.profiles?.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground" dir="ltr">
                  {m.profiles?.email ?? "—"}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select defaultValue={m.role_id} onValueChange={(v) => onChangeRole(m.id, v)} disabled={isPending}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name_ar || r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="neutral">{m.roles?.name_ar || m.roles?.name}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.sites?.name_ar || m.sites?.name || "كل المواقع"}</TableCell>
                <TableCell>
                  <Switch
                    checked={m.is_active}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => onToggleActive(m.id, v)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                <TableCell>
                  {canManage && (
                    <Button variant="ghost" size="icon" disabled={isPending} onClick={() => onRemove(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
