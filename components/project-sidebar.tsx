"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  Wallet,
  Users,
  CheckSquare,
  FileText,
  Scale,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  wedding_date: string | null;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, segment: "dashboard" },
  { label: "Budget", icon: Wallet, segment: "budget" },
  { label: "Vendors", icon: Users, segment: "vendors" },
  { label: "Checklist", icon: CheckSquare, segment: "checklist" },
  { label: "Documents", icon: FileText, segment: "documents" },
  { label: "Admin & Legal", icon: Scale, segment: "admin-legal" },
];

export function ProjectSidebar({
  project,
  role,
  projectId,
}: {
  project: Project;
  role: string;
  projectId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/app/projects/${projectId}`;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <Heart className="h-5 w-5 text-primary" />
        <span className="font-serif text-lg font-semibold text-sidebar-foreground">
          WeddingOS
        </span>
      </div>

      <div className="border-b border-border px-6 py-4">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {project.name}
        </p>
        {project.wedding_date && (
          <p className="text-xs text-muted-foreground">
            {new Date(project.wedding_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
          {role}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const href = `${basePath}/${item.segment}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.segment}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-4">
        <Link
          href="/app/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <Link
          href="/app/projects"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Heart className="h-4 w-4" />
          All Projects
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
