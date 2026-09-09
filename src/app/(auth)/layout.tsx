export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_top,_rgba(200,132,44,0.12),_transparent_55%)] px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          ق
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">نظام إدارة الجودة والعمليات</p>
          <p className="text-xs text-muted-foreground">لمصانع القهوة</p>
        </div>
      </div>
      {children}
    </div>
  );
}
