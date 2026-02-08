"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Save, RotateCcw } from "lucide-react";

interface Category {
  id: string;
  name: string;
  default_percent: number | null;
}
interface BudgetItem {
  id: string;
  category_id: string | null;
  estimated: number;
  actual: number;
  notes: string | null;
}
interface Project {
  id: string;
  total_budget: number;
  currency: string;
}

export function BudgetTable({
  projectId,
  project,
  categories,
  budgetItems,
  vendors,
}: {
  projectId: string;
  project: Project;
  categories: Category[];
  budgetItems: BudgetItem[];
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Record<string, { estimated: number; actual: number }>>(
    () => {
      const map: Record<string, { estimated: number; actual: number }> = {};
      for (const bi of budgetItems) {
        if (bi.category_id) {
          map[bi.category_id] = {
            estimated: bi.estimated ?? 0,
            actual: bi.actual ?? 0,
          };
        }
      }
      return map;
    }
  );
  const [saving, setSaving] = useState(false);

  const currency = project.currency ?? "EUR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const totalEstimated = Object.values(items).reduce(
    (s, i) => s + i.estimated,
    0
  );
  const totalActual = Object.values(items).reduce(
    (s, i) => s + i.actual,
    0
  );
  const budgetPercent =
    project.total_budget > 0
      ? Math.min(100, Math.round((totalActual / project.total_budget) * 100))
      : 0;

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    for (const cat of categories) {
      const val = items[cat.id];
      if (!val) continue;
      const existing = budgetItems.find((bi) => bi.category_id === cat.id);
      if (existing) {
        await supabase
          .from("budget_items")
          .update({ estimated: val.estimated, actual: val.actual })
          .eq("id", existing.id);
      } else {
        await supabase.from("budget_items").insert({
          project_id: projectId,
          category_id: cat.id,
          estimated: val.estimated,
          actual: val.actual,
        });
      }
    }
    toast.success("Budget saved!");
    setSaving(false);
    router.refresh();
  };

  const handleAutoAllocate = () => {
    const newItems = { ...items };
    for (const cat of categories) {
      const pct = cat.default_percent ?? 0;
      newItems[cat.id] = {
        estimated: Math.round((project.total_budget * pct) / 100),
        actual: items[cat.id]?.actual ?? 0,
      };
    }
    setItems(newItems);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold text-foreground">
              {fmt(project.total_budget)}
            </p>
          </div>
          <div className="flex-1 sm:mx-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Spent: {fmt(totalActual)}
              </span>
              <span className="text-muted-foreground">
                Estimated: {fmt(totalEstimated)}
              </span>
            </div>
            <Progress value={budgetPercent} className="mt-2 h-3" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAutoAllocate}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Auto-allocate
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Budget by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    %
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Estimated
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Actual
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const val = items[cat.id] ?? { estimated: 0, actual: 0 };
                  const rem = val.estimated - val.actual;
                  return (
                    <tr
                      key={cat.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-3 font-medium text-foreground">
                        {cat.name}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {cat.default_percent ?? 0}%
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={val.estimated}
                          onChange={(e) =>
                            setItems((prev) => ({
                              ...prev,
                              [cat.id]: {
                                ...val,
                                estimated:
                                  parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={val.actual}
                          onChange={(e) =>
                            setItems((prev) => ({
                              ...prev,
                              [cat.id]: {
                                ...val,
                                actual: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </td>
                      <td
                        className={`px-3 py-3 font-medium ${
                          rem < 0 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {fmt(rem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-medium">
                  <td className="px-3 py-3 text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {fmt(totalEstimated)}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {fmt(totalActual)}
                  </td>
                  <td
                    className={`px-3 py-3 ${
                      totalEstimated - totalActual < 0
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {fmt(totalEstimated - totalActual)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
