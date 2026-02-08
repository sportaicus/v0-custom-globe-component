import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ChecklistView } from "@/components/checklist-view";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [projectRes, itemsRes, categoriesRes, vendorsRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase
      .from("checklist_items")
      .select("*, categories(name)")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("categories")
      .select("id, name")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase
      .from("vendors")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name"),
  ]);

  if (!projectRes.data) notFound();

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Checklist
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track all your wedding to-dos.
        </p>
      </div>
      <ChecklistView
        projectId={projectId}
        items={itemsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        vendors={vendorsRes.data ?? []}
      />
    </div>
  );
}
