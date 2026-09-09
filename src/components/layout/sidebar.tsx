"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./nav-items";
import { useSession } from "./session-provider";
import { canAny } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useSession();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="mb-4 flex items-center gap-2 px-2 pt-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-bold text-[#241407]">
          ق
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {session.activeOrgNameAr || session.activeOrgName || "المصنع"}
          </p>
          <p className="truncate text-xs text-sidebar-muted">{session.roleNames.join("، ") || "عضو"}</p>
        </div>
      </div>

      {NAV_ITEMS.filter((item) => !item.anyOf || canAny(session.permissions, item.anyOf)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent/15 text-sidebar-accent"
                : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-auto px-2 pb-1 pt-4 text-[11px] leading-relaxed text-sidebar-muted/70">
        نظام إدارة الجودة والعمليات
        <br />
        الإصدار 1.0 (المرحلة الأولى)
      </div>
    </nav>
  );
}
