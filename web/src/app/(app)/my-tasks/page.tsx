"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PriorityBadge } from "@/components/shared";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoader, Select, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, taskStatusLabel, todayYmd } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Task, TaskStatus } from "@/lib/types";

type MyTask = Task & { project: { id: string; name: string } };

export default function MyTasksPage() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<{ tasks: MyTask[] }>("/tasks/mine");
  const [showDone, setShowDone] = useState(false);

  async function setStatus(task: MyTask, status: TaskStatus) {
    setData((d) => d && { tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      if (status === "DONE") toast(`Nice! "${task.title}" is done`);
    } catch (err) {
      toast(errorMessage(err), "error");
      reload();
    }
  }

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? "Could not load tasks"} onRetry={reload} />;

  const today = todayYmd();
  const tasks = data.tasks.filter((t) => showDone || t.status !== "DONE");

  return (
    <>
      <PageHeader icon={ListChecks}
        title="My tasks"
        description="Everything assigned to you, across every project."
        action={
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="accent-brand" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Show completed
          </label>
        }
      />
      <Card>
        {tasks.length === 0 ? (
          <EmptyState title="You're all caught up" description="New tasks assigned to you will show up here." />
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => {
              const overdue = t.status !== "DONE" && t.dueDate && t.dueDate.slice(0, 10) < today;
              return (
                <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className={`font-medium ${t.status === "DONE" ? "text-muted line-through" : ""}`}>{t.title}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      <Link href={`/projects/${t.project.id}`} className="hover:text-brand">
                        {t.project.name}
                      </Link>
                      {" · "}
                      <span className={overdue ? "font-medium text-red-600" : ""}>
                        {overdue ? "Overdue: " : "Due "}
                        {formatDate(t.dueDate)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.priority && <PriorityBadge priority={t.priority} />}
                    {t.status === "DONE" && <Badge tone="green">Done</Badge>}
                    <Select className="h-8 w-36 text-xs" value={t.status} onChange={(e) => setStatus(t, e.target.value as TaskStatus)}>
                      {(Object.keys(taskStatusLabel) as TaskStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {taskStatusLabel[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
