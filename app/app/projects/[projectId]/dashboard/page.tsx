import React from "react"
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  Calendar,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch all data in parallel
  const [budgetRes, vendorRes, checklistRes, docRes, legalRes] =
    await Promise.all([
      supabase
        .from("budget_items")
        .select("estimated, actual")
        .eq("project_id", projectId),
      supabase
        .from("vendors")
        .select("id, status")
        .eq("project_id", projectId),
      supabase
        .from("checklist_items")
        .select("id, status")
        .eq("project_id", projectId),
      supabase
        .from("documents")
        .select("id, analysis_status")
        .eq("project_id", projectId),
      supabase
        .from("project_legal_tasks")
        .select("id, status")
        .eq("project_id", projectId),
    ]);

  const budgetItems = budgetRes.data ?? [];
  const vendors = vendorRes.data ?? [];
  const checklist = checklistRes.data ?? [];
  const docs = docRes.data ?? [];
  const legalTasks = legalRes.data ?? [];

  const totalEstimated = budgetItems.reduce(
    (s, b) => s + (b.estimated ?? 0),
    0
  );
  const totalActual = budgetItems.reduce((s, b) => s + (b.actual ?? 0), 0);
  const remaining = totalEstimated - totalActual;
  const budgetPercent =
    totalEstimated > 0
      ? Math.min(100, Math.round((totalActual / totalEstimated) * 100))
      : 0;

  const daysUntil = project.wedding_date
    ? Math.ceil(
        (new Date(project.wedding_date).getTime() - Date.now()) / 86400000
      )
    : null;

  const checklistDone = checklist.filter((c) => c.status === "done").length;
  const legalDone = legalTasks.filter((t) => t.status === "done").length;
  const pendingDocs = docs.filter(
    (d) => d.analysis_status === "pending"
  ).length;
  const bookedVendors = vendors.filter((v) => v.status === "booked").length;

  const currency = project.currency ?? "EUR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const alerts: { icon: React.ElementType; text: string; type: string }[] = [];
  if (remaining < 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `Budget exceeded by ${fmt(Math.abs(remaining))}`,
      type: "destructive",
    });
  }
  if (pendingDocs > 0) {
    alerts.push({
      icon: FileText,
      text: `${pendingDocs} document(s) pending analysis`,
      type: "warning",
    });
  }
  if (daysUntil !== null && daysUntil < 30 && daysUntil > 0) {
    alerts.push({
      icon: Clock,
      text: `Only ${daysUntil} days until the wedding!`,
      type: "warning",
    });
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">{project.name}</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <alert.icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-foreground">{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Until Wedding
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {daysUntil !== null
                ? daysUntil > 0
                  ? daysUntil
                  : "Today!"
                : "No date set"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Spent
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {fmt(totalActual)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {fmt(totalEstimated)} estimated
            </p>
            <Progress value={budgetPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {bookedVendors}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {vendors.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checklist
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {checklistDone}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {checklist.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
            <Progress
              value={
                checklist.length > 0
                  ? Math.round((checklistDone / checklist.length) * 100)
                  : 0
              }
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Legal Tasks Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Legal & Admin Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress
                value={
                  legalTasks.length > 0
                    ? Math.round((legalDone / legalTasks.length) * 100)
                    : 0
                }
                className="h-3"
              />
            </div>
            <span className="text-sm font-medium text-foreground">
              {legalDone} / {legalTasks.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {legalTasks.length - legalDone} task(s) remaining for{" "}
            {project.country ?? "your country"}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
