import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BudgetTable } from "@/components/budget-table";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [projectRes, categoriesRes, budgetRes, vendorsRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase
      .from("categories")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase.from("budget_items").select("*").eq("project_id", projectId),
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
          Budget
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track estimated vs. actual spending per category.
        </p>
      </div>
      <BudgetTable
        projectId={projectId}
        project={projectRes.data}
        categories={categoriesRes.data ?? []}
        budgetItems={budgetRes.data ?? []}
        vendors={vendorsRes.data ?? []}
      />
    </div>
  );
}
