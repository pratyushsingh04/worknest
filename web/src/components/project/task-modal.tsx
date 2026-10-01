"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { PriorityBadge } from "@/components/shared";
import { api, errorMessage } from "@/lib/api";
import { formatDate, taskStatusLabel } from "@/lib/format";
import type { Milestone, Priority, Task, TaskStatus, UserBrief } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task: Task | null; // null = create
  defaultStatus?: TaskStatus;
  canManage: boolean;
  members: UserBrief[];
  milestones: Milestone[];
}

const emptyForm = { title: "", description: "", status: "TODO" as TaskStatus, priority: "MEDIUM" as Priority, assigneeId: "", milestoneId: "", dueDate: "", estimateHours: "" };

/** Mount with a `key` per task so the form starts fresh each time it opens. */
export function TaskModal({ open, onClose, projectId, task, defaultStatus, canManage, members, milestones }: Props) {
  const [form, setForm] = useState(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority ?? ("MEDIUM" as Priority),
          assigneeId: task.assignee?.id ?? "",
          milestoneId: task.milestoneId ?? "",
          dueDate: task.dueDate?.slice(0, 10) ?? "",
          estimateHours: task.estimateHours?.toString() ?? "",
        }
      : { ...emptyForm, status: defaultStatus ?? "TODO" },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      milestoneId: form.milestoneId || null,
      dueDate: form.dueDate || null,
      estimateHours: form.estimateHours ? Number(form.estimateHours) : null,
    };
    try {
      if (task) await api.patch(`/tasks/${task.id}`, payload);
      else await api.post("/tasks", { ...payload, projectId });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!task || !confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.del(`/tasks/${task.id}`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (task && !canManage) {
    return (
      <Modal open={open} onClose={onClose} title={task.title}>
        <div className="space-y-4 text-sm">
          {task.description && <p className="whitespace-pre-wrap text-ink/80">{task.description}</p>}
          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Status">{taskStatusLabel[task.status]}</Detail>
            <Detail label="Priority">{task.priority && <PriorityBadge priority={task.priority} />}</Detail>
            <Detail label="Assignee">{task.assignee?.name ?? "Unassigned"}</Detail>
            <Detail label="Due">{formatDate(task.dueDate)}</Detail>
            <Detail label="Milestone">{milestones.find((m) => m.id === task.milestoneId)?.title ?? "—"}</Detail>
            <Detail label="Estimate">{task.estimateHours ? `${task.estimateHours} h` : "—"}</Detail>
          </dl>
          <p className="text-xs text-muted">Drag the card on the board to update its status.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Title">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
              {(Object.keys(taskStatusLabel) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabel[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
          <Field label="Assignee">
            <Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Milestone">
            <Select value={form.milestoneId} onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}>
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Estimate (hours)">
            <Input type="number" min="0.5" step="0.5" value={form.estimateHours} onChange={(e) => setForm({ ...form, estimateHours: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center justify-between pt-2">
          {task ? (
            <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
