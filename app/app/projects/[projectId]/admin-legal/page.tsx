import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminLegalView } from "@/components/admin-legal-view";

export default async function AdminLegalPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [projectRes, tasksRes] = await Promise.all([
    supabase
      .from("projects")
      .select("country, wedding_date")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_legal_tasks")
      .select("*, legal_tasks(*)")
      .eq("project_id", projectId)
      .order("due_date"),
  ]);

  if (!projectRes.data) notFound();

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Admin & Legal
        </h1>
        <p className="mt-1 text-muted-foreground">
          Country-specific legal requirements for{" "}
          {projectRes.data.country ?? "your wedding"}.
        </p>
      </div>
      <AdminLegalView
        projectId={projectId}
        tasks={tasksRes.data ?? []}
        country={projectRes.data.country ?? "US"}
      />
    </div>
  );
}
