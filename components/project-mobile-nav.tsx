"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Users,
  CheckSquare,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { label: "Dashboard", icon: LayoutDashboard, segment: "dashboard" },
  { label: "Budget", icon: Wallet, segment: "budget" },
  { label: "Vendors", icon: Users, segment: "vendors" },
  { label: "Checklist", icon: CheckSquare, segment: "checklist" },
  { label: "Docs", icon: FileText, segment: "documents" },
];

export function ProjectMobileNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const basePath = `/app/projects/${projectId}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-background px-2 py-2 md:hidden">
      {mobileItems.map((item) => {
        const href = `${basePath}/${item.segment}`;
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={item.segment}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
