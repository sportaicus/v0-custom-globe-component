import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { VendorList } from "@/components/vendor-list";

export default async function VendorsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [projectRes, vendorsRes, categoriesRes] = await Promise.all([
    supabase.from("projects").select("currency").eq("id", projectId).single(),
    supabase
      .from("vendors")
      .select("*, quotes(*)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
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
          Vendors
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your vendors and track their status.
        </p>
      </div>
      <VendorList
        projectId={projectId}
        vendors={vendorsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        currency={projectRes.data.currency ?? "EUR"}
      />
    </div>
  );
}
