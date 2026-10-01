"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PriorityBadge } from "@/components/shared";
import { Avatar, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, taskStatusLabel } from "@/lib/format";
import type { Milestone, Task, TaskStatus } from "@/lib/types";

const columns: { status: TaskStatus; accent: string }[] = [
  { status: "TODO", accent: "bg-gray-400" },
  { status: "IN_PROGRESS", accent: "bg-blue-500" },
  { status: "IN_REVIEW", accent: "bg-amber-500" },
  { status: "DONE", accent: "bg-emerald-500" },
];

interface Props {
  tasks: Task[];
  milestones: Milestone[];
  canManage: boolean;
  onTasksChange: (updater: (tasks: Task[]) => Task[]) => void;
  onOpenTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function Board({ tasks, milestones, canManage, onTasksChange, onOpenTask, onAddTask }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const canMove = (t: Task) => canManage || t.assignee?.id === user.id;

  async function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    const previous = task.status;
    // Optimistic: move the card immediately, roll back if the server refuses.
    onTasksChange((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await api.patch(`/tasks/${taskId}`, { status });
    } catch (err) {
      onTasksChange((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: previous } : t)));
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 scroll-thin sm:mx-0 sm:px-0">
      <div className="grid min-w-[960px] grid-cols-4 gap-4">
        {columns.map(({ status, accent }) => {
          const items = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                if (dragId) moveTask(dragId, status);
                setDragId(null);
              }}
              className={clsx("flex min-h-96 flex-col rounded-2xl bg-gray-100/70 p-2 transition-colors", overColumn === status && "bg-brand-soft ring-2 ring-brand/30")}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className={clsx("size-2 rounded-full", accent)} />
                  {taskStatusLabel[status]}
                  <span className="font-normal text-muted">{items.length}</span>
                </div>
                {canManage && (
                  <button onClick={() => onAddTask(status)} className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink" aria-label={`Add task to ${taskStatusLabel[status]}`}>
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <AnimatePresence initial={false}>
                {items.map((t) => {
                  const movable = canMove(t);
                  const milestone = milestones.find((m) => m.id === t.milestoneId);
                  return (
                    // Outer motion wrapper animates the card between columns; the inner div keeps native drag-and-drop.
                    <motion.div
                      key={t.id}
                      layout
                      layoutId={`task-${t.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    >
                    <div
                      draggable={movable}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onOpenTask(t)}
                      className={clsx(
                        "rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_10px_20px_-14px_rgb(17_17_24_/_0.35)]",
                        movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        dragId === t.id && "opacity-50",
                      )}
                    >
                      <p className={clsx("text-sm font-medium", t.status === "DONE" && "text-muted line-through")}>{t.title}</p>
                      {milestone && <p className="mt-1 truncate text-xs text-muted">{milestone.title}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {t.priority && <PriorityBadge priority={t.priority} />}
                          {t.dueDate && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <CalendarDays className="size-3" />
                              {formatDate(t.dueDate).replace(/ \d{4}$/, "")}
                            </span>
                          )}
                        </div>
                        {t.assignee && <Avatar name={t.assignee.name} size="sm" />}
                      </div>
                    </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
