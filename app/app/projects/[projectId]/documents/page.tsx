import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DocumentsView } from "@/components/documents-view";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [projectRes, docsRes, vendorsRes, categoriesRes] = await Promise.all([
    supabase.from("projects").select("currency").eq("id", projectId).single(),
    supabase
      .from("documents")
      .select("*, vendors(name), categories(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendors")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  if (!projectRes.data) notFound();

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Documents
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload vendor emails, quotes, and contracts for analysis.
        </p>
      </div>
      <DocumentsView
        projectId={projectId}
        documents={docsRes.data ?? []}
        vendors={vendorsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        currency={projectRes.data.currency ?? "EUR"}
      />
    </div>
  );
}
