import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة الجودة والعمليات — مصنع القهوة",
  description: "نظام مركزي لإدارة الجودة، سلامة الغذاء، التفتيش، عدم المطابقات، والإجراءات التصحيحية والوقائية.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#15100c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="top-center" richColors closeButton dir="rtl" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
