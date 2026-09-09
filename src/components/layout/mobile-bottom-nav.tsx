"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, AlertTriangle, Wrench, Menu } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/inspections", label: "التفتيش", icon: ClipboardCheck },
  { href: "/findings", label: "الملاحظات", icon: AlertTriangle },
  { href: "/capas", label: "الإجراءات", icon: Wrench },
];

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t bg-background/95 backdrop-blur md:hidden">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "text-accent" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground">
        <Menu className="h-5 w-5" />
        المزيد
      </button>
    </nav>
  );
}
