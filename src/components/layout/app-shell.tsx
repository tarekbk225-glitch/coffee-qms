"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 border-e bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 h-svh">
          <Sidebar />
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-3 pb-20 pt-4 md:px-6 md:pb-8 md:pt-6">{children}</main>
      </div>

      <MobileBottomNav onMore={() => setMoreOpen(true)} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-sidebar p-0 text-sidebar-foreground md:hidden">
          <SheetTitle className="sr-only">كل الأقسام</SheetTitle>
          <div className="max-h-[75vh] overflow-y-auto">
            <Sidebar onNavigate={() => setMoreOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
