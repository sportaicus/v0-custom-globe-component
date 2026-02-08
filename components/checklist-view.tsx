"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Circle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<string, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

interface ChecklistItem {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  category_id: string | null;
  vendor_id: string | null;
  categories: { name: string } | null;
}

export function ChecklistView({
  projectId,
  items,
  categories,
  vendors,
}: {
  projectId: string;
  items: ChecklistItem[];
  categories: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Group by category
  const grouped: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    const catName = item.categories?.name ?? "Uncategorized";
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(item);
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const catId = form.get("category_id") as string;
    const vendorId = form.get("vendor_id") as string;

    const { error } = await supabase.from("checklist_items").insert({
      project_id: projectId,
      title: form.get("title") as string,
      category_id: catId === "none" ? null : catId,
      vendor_id: vendorId === "none" ? null : vendorId,
      due_date: (form.get("due_date") as string) || null,
      status: "not_started",
    });

    if (error) {
      toast.error("Failed to add item.");
    } else {
      toast.success("Checklist item added!");
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleToggle = async (item: ChecklistItem) => {
    const supabase = createClient();
    const nextStatus =
      item.status === "done"
        ? "not_started"
        : item.status === "not_started"
          ? "in_progress"
          : "done";

    await supabase
      .from("checklist_items")
      .update({ status: nextStatus })
      .eq("id", item.id);
    router.refresh();
  };

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {doneCount} / {items.length} completed
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">
                Add Checklist Item
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cl-title">Title</Label>
                <Input
                  id="cl-title"
                  name="title"
                  placeholder="Book the DJ"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select name="category_id" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Vendor</Label>
                  <Select name="vendor_id" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cl-due">Due Date</Label>
                <Input id="cl-due" name="due_date" type="date" />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(grouped).map(([catName, catItems]) => (
        <Card key={catName}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {catName}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0">
            {catItems.map((item) => {
              const Icon = STATUS_ICONS[item.status] ?? Circle;
              return (
                <button
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      item.status === "done"
                        ? "text-primary"
                        : item.status === "in_progress"
                          ? "text-chart-4"
                          : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      item.status === "done"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {item.title}
                  </span>
                  {item.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-muted-foreground">No checklist items yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
