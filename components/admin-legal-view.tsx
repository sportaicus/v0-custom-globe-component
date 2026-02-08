"use client";

import React from "react"

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Circle, CheckCircle2, Clock, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LegalTask {
  id: string;
  code: string;
  title: string;
  description: string | null;
  offset_days: number | null;
}

interface ProjectLegalTask {
  id: string;
  due_date: string | null;
  status: string;
  legal_tasks: LegalTask | null;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

export function AdminLegalView({
  projectId,
  tasks,
  country,
}: {
  projectId: string;
  tasks: ProjectLegalTask[];
  country: string;
}) {
  const router = useRouter();
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progress =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const handleToggle = async (task: ProjectLegalTask) => {
    const supabase = createClient();
    const nextStatus =
      task.status === "done"
        ? "not_started"
        : task.status === "not_started"
          ? "in_progress"
          : "done";

    await supabase
      .from("project_legal_tasks")
      .update({ status: nextStatus })
      .eq("id", task.id);
    router.refresh();
  };

  const countryNames: Record<string, string> = {
    FR: "France",
    US: "United States",
    UK: "United Kingdom",
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Scale className="h-10 w-10 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">
                {countryNames[country] ?? country} Legal Requirements
              </p>
              <span className="text-sm text-muted-foreground">
                {doneCount} / {tasks.length}
              </span>
            </div>
            <Progress value={progress} className="mt-2 h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Legal Tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {tasks.map((task) => {
            const lt = task.legal_tasks;
            if (!lt) return null;
            const Icon = STATUS_ICONS[task.status] ?? Circle;
            const overdue =
              task.status !== "done" && isOverdue(task.due_date);

            return (
              <button
                key={task.id}
                onClick={() => handleToggle(task)}
                className="flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    task.status === "done"
                      ? "text-primary"
                      : task.status === "in_progress"
                        ? "text-chart-4"
                        : "text-muted-foreground"
                  )}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.status === "done"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {lt.title}
                  </p>
                  {lt.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lt.description}
                    </p>
                  )}
                </div>
                {task.due_date && (
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      overdue
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {overdue && "Overdue: "}
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </button>
            );
          })}

          {tasks.length === 0 && (
            <div className="flex flex-col items-center py-12">
              <p className="text-muted-foreground">
                No legal tasks for this country yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
