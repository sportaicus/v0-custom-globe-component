import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart, Plus, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewProjectDialog } from "@/components/new-project-dialog";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id, role, projects(*)")
    .eq("user_id", user.id);

  const projects =
    memberships?.map((m) => ({
      ...(m.projects as Record<string, unknown>),
      role: m.role,
    })) ?? [];

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-semibold text-foreground">
              WeddingOS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/settings"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Your Weddings
            </h1>
            <p className="mt-1 text-muted-foreground">
              Select a project or create a new one.
            </p>
          </div>
          <NewProjectDialog />
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h2 className="text-lg font-medium text-foreground">
                No projects yet
              </h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                Create your first wedding project to get started.
              </p>
              <NewProjectDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: Record<string, unknown>) => (
              <Link
                key={project.id as string}
                href={`/app/projects/${project.id}/dashboard`}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate font-serif text-lg font-semibold text-foreground">
                        {project.name as string}
                      </h3>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
                        {project.role as string}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      {project.wedding_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(
                            project.wedding_date as string
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {project.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {project.location as string}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
