"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { useSession } from "./session-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  title_ar: string | null;
  body_ar: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

const ENTITY_HREF: Record<string, string> = {
  inspection: "/inspections",
  finding: "/findings",
  capa: "/capas",
  asset: "/assets",
};

export function NotificationBell() {
  const session = useSession();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, title_ar, body_ar, entity_type, entity_id, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as NotificationRow[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    // Fetch-on-mount + realtime subscription: load() sets state after its
    // own await, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const channel = supabase
      .channel(`notifications:${session.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = items.filter((i) => !i.is_read).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("is_read", false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">الإشعارات</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-accent hover:underline">
              <Check className="h-3 w-3" /> تعليم الكل كمقروء
            </button>
          )}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">لا توجد إشعارات حتى الآن</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className={cn("border-b last:border-0", !n.is_read && "bg-accent/5")}>
                  <Link
                    href={n.entity_type ? `${ENTITY_HREF[n.entity_type] ?? "#"}/${n.entity_id}` : "#"}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      setOpen(false);
                    }}
                    className="block px-3 py-2.5 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title_ar || n.title}</p>
                      {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </div>
                    {n.body_ar && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body_ar}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
