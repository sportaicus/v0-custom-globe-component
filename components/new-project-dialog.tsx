"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_CATEGORIES = [
  { name: "Venue", default_percent: 30, sort_order: 0 },
  { name: "Catering", default_percent: 20, sort_order: 1 },
  { name: "Photography & Video", default_percent: 12, sort_order: 2 },
  { name: "Music & Entertainment", default_percent: 8, sort_order: 3 },
  { name: "Flowers & Decor", default_percent: 8, sort_order: 4 },
  { name: "Attire & Beauty", default_percent: 7, sort_order: 5 },
  { name: "Stationery", default_percent: 3, sort_order: 6 },
  { name: "Transport", default_percent: 3, sort_order: 7 },
  { name: "Gifts & Favours", default_percent: 2, sort_order: 8 },
  { name: "Other", default_percent: 7, sort_order: 9 },
];

const DEFAULT_CHECKLIST = [
  { title: "Book ceremony venue", category: "Venue" },
  { title: "Book reception venue", category: "Venue" },
  { title: "Choose caterer and tasting", category: "Catering" },
  { title: "Hire photographer", category: "Photography & Video" },
  { title: "Hire videographer", category: "Photography & Video" },
  { title: "Book DJ or band", category: "Music & Entertainment" },
  { title: "Choose florist", category: "Flowers & Decor" },
  { title: "Order wedding dress / suit", category: "Attire & Beauty" },
  { title: "Send save-the-dates", category: "Stationery" },
  { title: "Send invitations", category: "Stationery" },
  { title: "Arrange transport", category: "Transport" },
  { title: "Plan honeymoon", category: "Other" },
];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const wedding_date = form.get("wedding_date") as string;
    const location = form.get("location") as string;
    const country = form.get("country") as string;
    const guest_count = parseInt(form.get("guest_count") as string) || 0;
    const total_budget = parseFloat(form.get("total_budget") as string) || 0;
    const currency = form.get("currency") as string;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in.");
      setLoading(false);
      return;
    }

    // Create project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        name,
        wedding_date: wedding_date || null,
        location: location || null,
        country,
        guest_count,
        total_budget,
        currency,
        created_by: user.id,
      })
      .select()
      .single();

    if (projErr || !project) {
      toast.error("Failed to create project.");
      setLoading(false);
      return;
    }

    // Add owner membership
    await supabase.from("project_members").insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
    });

    // Create default categories
    const catInserts = DEFAULT_CATEGORIES.map((c) => ({
      project_id: project.id,
      name: c.name,
      default_percent: c.default_percent,
      sort_order: c.sort_order,
    }));
    const { data: categories } = await supabase
      .from("categories")
      .insert(catInserts)
      .select();

    // Create default checklist items linked to categories
    if (categories) {
      const catMap = new Map(categories.map((c) => [c.name, c.id]));
      const checkInserts = DEFAULT_CHECKLIST.map((item) => ({
        project_id: project.id,
        category_id: catMap.get(item.category) ?? null,
        title: item.title,
        status: "not_started",
      }));
      await supabase.from("checklist_items").insert(checkInserts);
    }

    // Create project legal tasks based on country
    const { data: legalTasks } = await supabase
      .from("legal_tasks")
      .select("*")
      .eq("country", country);

    if (legalTasks && wedding_date) {
      const wDate = new Date(wedding_date);
      const legalInserts = legalTasks.map((lt) => ({
        project_id: project.id,
        legal_task_id: lt.id,
        due_date: new Date(
          wDate.getTime() + (lt.offset_days ?? 0) * 86400000
        )
          .toISOString()
          .split("T")[0],
        status: "not_started",
      }));
      await supabase.from("project_legal_tasks").insert(legalInserts);
    }

    // Create default budget items per category
    if (categories && total_budget > 0) {
      const budgetInserts = categories.map((cat) => ({
        project_id: project.id,
        category_id: cat.id,
        estimated: Math.round(
          (total_budget * (cat.default_percent ?? 0)) / 100
        ),
        actual: 0,
      }));
      await supabase.from("budget_items").insert(budgetInserts);
    }

    toast.success("Project created!");
    setOpen(false);
    setLoading(false);
    router.push(`/app/projects/${project.id}/dashboard`);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Create a Wedding Project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Wedding Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Sarah & Tom's Wedding"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wedding_date">Wedding Date</Label>
              <Input id="wedding_date" name="wedding_date" type="date" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Paris, France"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Select name="country" defaultValue="US">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="guest_count">Guest Count</Label>
              <Input
                id="guest_count"
                name="guest_count"
                type="number"
                placeholder="100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="total_budget">Total Budget</Label>
              <Input
                id="total_budget"
                name="total_budget"
                type="number"
                placeholder="30000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select name="currency" defaultValue="EUR">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
