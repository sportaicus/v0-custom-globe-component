import React from "react"
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ProjectMobileNav } from "@/components/project-mobile-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  return (
    <div className="flex min-h-svh bg-background">
      <ProjectSidebar
        project={project}
        role={membership.role}
        projectId={projectId}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <ProjectMobileNav projectId={projectId} />
    </div>
  );
}
