"use client";

import { createContext, useContext } from "react";

import type { SessionContext } from "@/lib/session";
import { canAny, type PermissionKey } from "@/lib/permissions";

const Ctx = createContext<SessionContext | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionContext;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function useCan(...keys: PermissionKey[]): boolean {
  const session = useSession();
  return canAny(session.permissions, keys);
}
