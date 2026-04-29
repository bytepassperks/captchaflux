"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  Zap,
  ShieldCheck,
  Puzzle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/api", label: "API Keys", icon: Key },
  { href: "/dashboard/benchmarks", label: "Benchmarks", icon: BarChart3 },
  { href: "/dashboard/verify", label: "Verify Site", icon: ShieldCheck },
  { href: "/dashboard/extension", label: "Chrome Extension", icon: Puzzle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-border/50 bg-sidebar flex flex-col">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-border/50">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          CaptchaFlux
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border/50">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
        >
          &larr; Back to site
        </Link>
      </div>
    </aside>
  );
}
