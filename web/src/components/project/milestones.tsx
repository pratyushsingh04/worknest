"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Circle, MessageSquareWarning, Plus } from "lucide-react";
import { MilestoneStatusBadge } from "@/components/shared";
import { Button, Card, EmptyState, Field, FormError, Input, Modal, ProgressBar, Select, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, taskStatusLabel } from "@/lib/format";
import type { Milestone, MilestoneStatus, Task } from "@/lib/types";

interface Props {
  projectId: string;
  milestones: Milestone[];
  tasks: Task[];
  canManage: boolean;
  isClient: boolean;
}

const teamSettableStatuses: MilestoneStatus[] = ["PENDING", "IN_PROGRESS", "AWAITING_APPROVAL"];

export function Milestones({ projectId, milestones, tasks, canManage, isClient }: Props) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState<Milestone | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(m: Milestone, status: MilestoneStatus) {
    setBusy(m.id);
    try {
      await api.patch(`/projects/${projectId}/milestones/${m.id}`, { status });
      if (status === "AWAITING_APPROVAL") toast("Sent to the client for approval");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function approve(m: Milestone) {
    setBusy(m.id);
    try {
      await api.post(`/projects/${projectId}/milestones/${m.id}/review`, { decision: "APPROVED" });
      toast(`Approved "${m.title}"`);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add milestone
          </Button>
        </div>
      )}
      {milestones.length === 0 && (
        <Card>
          <EmptyState title="No milestones yet" description={canManage ? "Break the project into deliverables the client can sign off." : undefined} />
        </Card>
      )}
      {milestones.map((m, i) => {
        const mTasks = tasks.filter((t) => t.milestoneId === m.id);
        const done = mTasks.filter((t) => t.status === "DONE").length;
        const percent = mTasks.length ? Math.round((done / mTasks.length) * 100) : 0;
        return (
          <Card key={m.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-muted">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-sm text-muted">Due {formatDate(m.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.status !== "APPROVED" ? (
                  <Select
                    className="h-8 w-52 text-xs"
                    value={teamSettableStatuses.includes(m.status) ? m.status : ""}
                    disabled={busy === m.id}
                    onChange={(e) => setStatus(m, e.target.value as MilestoneStatus)}
                  >
                    {!teamSettableStatuses.includes(m.status) && <option value="">Changes requested</option>}
                    <option value="PENDING">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="AWAITING_APPROVAL">Send for client approval</option>
                  </Select>
                ) : (
                  <MilestoneStatusBadge status={m.status} forClient={isClient} />
                )}
              </div>
            </div>

            {m.status === "CHANGES_REQUESTED" && m.clientNote && (
              <div className="mt-4 flex gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
                <p>
                  <span className="font-medium">Client feedback:</span> {m.clientNote}
                </p>
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>
                  {done} of {mTasks.length} tasks done
                </span>
                <span>{percent}%</span>
              </div>
              <ProgressBar percent={percent} />
            </div>

            {mTasks.length > 0 && (
              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {mTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    {t.status === "DONE" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" /> : <Circle className="size-4 shrink-0 text-gray-300" />}
                    <span className={t.status === "DONE" ? "text-muted" : ""}>{t.title}</span>
                    {t.status !== "DONE" && t.status !== "TODO" && <span className="text-xs text-blue-600">{taskStatusLabel[t.status]}</span>}
                  </li>
                ))}
              </ul>
            )}

            {isClient && m.status === "AWAITING_APPROVAL" && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <Button variant="success" size="sm" loading={busy === m.id} onClick={() => approve(m)}>
                  Approve milestone
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setReviewing(m)}>
                  Request changes
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      <AddMilestoneModal open={adding} onClose={() => setAdding(false)} projectId={projectId} />
      <RequestChangesModal milestone={reviewing} onClose={() => setReviewing(null)} projectId={projectId} />
    </div>
  );
}

function AddMilestoneModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/milestones`, { title, dueDate: dueDate || null });
      setTitle("");
      setDueDate("");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add milestone">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Title">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Payments & checkout" />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RequestChangesModal({ milestone, onClose, projectId }: { milestone: Milestone | null; onClose: () => void; projectId: string }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!milestone) return;
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/milestones/${milestone.id}/review`, { decision: "CHANGES_REQUESTED", note });
      toast("Feedback sent to the team");
      setNote("");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!milestone} onClose={onClose} title={`Request changes: ${milestone?.title ?? ""}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="What needs to change?">
          <Textarea required value={note} onChange={(e) => setNote(e.target.value)} placeholder="The cart total doesn't include delivery charges…" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Send feedback
          </Button>
        </div>
      </form>
    </Modal>
  );
}
