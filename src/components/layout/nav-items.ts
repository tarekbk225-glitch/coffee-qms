import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Boxes,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Any of these permissions grants visibility; empty = visible to every org member */
  anyOf?: PermissionKey[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  {
    href: "/templates",
    label: "قوالب التفتيش",
    icon: ClipboardList,
  },
  {
    href: "/inspections",
    label: "التفتيشات",
    icon: ClipboardCheck,
  },
  { href: "/findings", label: "عدم المطابقات", icon: AlertTriangle },
  { href: "/capas", label: "الإجراءات التصحيحية", icon: Wrench },
  { href: "/assets", label: "الأصول والمعدات", icon: Boxes },
  {
    href: "/audit",
    label: "سجل التدقيق",
    icon: History,
    anyOf: [PERMISSIONS.REPORT_VIEW_ORG, PERMISSIONS.REPORT_VIEW],
  },
  {
    href: "/settings",
    label: "الإعدادات",
    icon: Settings,
    anyOf: [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.SITE_MANAGE, PERMISSIONS.ADMIN_ORG_MANAGE],
  },
];
