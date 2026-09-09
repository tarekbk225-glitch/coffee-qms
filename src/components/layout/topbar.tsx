"use client";

import { useState } from "react";
import { Menu, LogOut, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { useSession } from "./session-provider";
import { signOut } from "@/app/(auth)/actions";

export function Topbar() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const initials = (session.fullNameAr || session.fullName || session.email || "؟").trim().slice(0, 1);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground [&_button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </Sheet>

      <p className="truncate text-sm font-semibold text-muted-foreground md:text-base">
        {session.activeOrgNameAr || session.activeOrgName}
      </p>

      <div className="ms-auto flex items-center gap-1.5">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{session.fullNameAr || session.fullName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground" dir="ltr">
                {session.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> إعدادات الحساب
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" /> تسجيل الخروج
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
