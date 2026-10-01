"use client";

import { useEffect, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { CalendarDays, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { LeaveStatusBadge } from "@/components/shared";
import { Avatar, Button, Card, CardHeader, EmptyState, Field, FormError, Input, Modal, PageHeader, PageLoader, ProgressBar, Select, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, todayYmd } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { Leave, LeaveBalance, LeaveType } from "@/lib/types";

const typeLabel: Record<LeaveType, string> = { CASUAL: "Casual", SICK: "Sick", EARNED: "Earned", UNPAID: "Unpaid" };

export default function LeavesPage() {
  const { hasRole } = useAuth();
  const isLead = hasRole("ADMIN", "MANAGER");
  const [view, setView] = useState<"mine" | "approvals">("mine");
  const [applying, setApplying] = useState(false);
  const balance = useApi<{ balance: LeaveBalance[] }>("/leaves/balance");
  const mine = useApi<{ leaves: Leave[] }>("/leaves/mine");
  const toast = useToast();

  const reloadMine = () => {
    balance.reload();
    mine.reload();
  };

  async function cancel(leave: Leave) {
    try {
      await api.post(`/leaves/${leave.id}/cancel`);
      toast("Request cancelled");
      reloadMine();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <>
      <PageHeader icon={CalendarDays}
        title="Leave"
        description="Plan time off and keep track of your balance."
        action={
          <Button onClick={() => setApplying(true)}>
            <Plus className="size-4" /> Apply for leave
          </Button>
        }
      />

      {isLead && (
        <div className="mb-5 inline-flex rounded-lg bg-surface p-1 ring-1 ring-line">
          {(["mine", "approvals"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx("rounded-md px-3 py-1.5 text-sm font-medium", view === v ? "bg-brand text-white" : "text-muted hover:text-ink")}
            >
              {v === "mine" ? "My leave" : "Team approvals"}
            </button>
          ))}
        </div>
      )}

      {view === "approvals" && isLead ? (
        <Approvals />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {balance.data?.balance.map((b) => (
              <Card key={b.type} className="p-5">
                <p className="text-sm text-muted">{typeLabel[b.type]} leave</p>
                <p className="mt-2 text-2xl font-semibold">
                  {b.remaining}
                  <span className="text-sm font-normal text-muted"> / {b.allowed} days left</span>
                </p>
                <ProgressBar percent={Math.round((b.used / b.allowed) * 100)} className="mt-3" />
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader title="My requests" />
            {mine.loading ? (
              <PageLoader />
            ) : !mine.data?.leaves.length ? (
              <EmptyState title="No leave requests yet" />
            ) : (
              <ul className="divide-y divide-line">
                {mine.data.leaves.map((l) => (
                  <li key={l.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {typeLabel[l.type]} · {l.days} day{l.days > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)} · {l.reason}
                      </p>
                      {l.reviewer && (
                        <p className="mt-1 text-xs text-muted">
                          Reviewed by {l.reviewer.name}
                          {l.reviewNote && `: "${l.reviewNote}"`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <LeaveStatusBadge status={l.status} />
                      {l.status === "PENDING" && (
                        <Button variant="ghost" size="sm" onClick={() => cancel(l)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <ApplyModal
        open={applying}
        onClose={() => setApplying(false)}
        onApplied={() => {
          setApplying(false);
          setView("mine");
          reloadMine();
        }}
      />
    </>
  );
}

function Approvals() {
  const toast = useToast();
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const { data, loading, reload } = useApi<{ leaves: Leave[] }>(`/leaves/team?status=${status}`);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on("leave:changed", reload);
    return () => {
      socket.off("leave:changed", reload);
    };
  }, [reload]);

  async function review(leave: Leave, decision: "APPROVED" | "REJECTED") {
    const note = decision === "REJECTED" ? (prompt("Reason for rejecting (optional)") ?? undefined) : undefined;
    setBusy(leave.id);
    try {
      await api.post(`/leaves/${leave.id}/review`, { decision, note: note || undefined });
      toast(`Leave ${decision.toLowerCase()} for ${leave.user.name}`);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Team leave requests"
        action={
          <Select className="h-8 w-36 text-xs" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
      />
      {loading ? (
        <PageLoader />
      ) : !data?.leaves.length ? (
        <EmptyState title={status === "PENDING" ? "No requests waiting for you" : "Nothing here"} />
      ) : (
        <ul className="divide-y divide-line">
          {data.leaves.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Avatar name={l.user.name} />
                <div>
                  <p className="text-sm font-medium">
                    {l.user.name} <span className="font-normal text-muted">· {typeLabel[l.type]} · {l.days} day{l.days > 1 ? "s" : ""}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {formatDate(l.startDate)} – {formatDate(l.endDate)}
                  </p>
                  <p className="mt-1 text-sm">&ldquo;{l.reason}&rdquo;</p>
                </div>
              </div>
              {l.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={busy === l.id} onClick={() => review(l, "REJECTED")}>
                    Reject
                  </Button>
                  <Button size="sm" variant="success" loading={busy === l.id} onClick={() => review(l, "APPROVED")}>
                    Approve
                  </Button>
                </div>
              ) : (
                <LeaveStatusBadge status={l.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ApplyModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ type: "CASUAL" as LeaveType, startDate: "", endDate: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/leaves", form);
      toast("Leave request sent to your manager");
      setForm({ type: "CASUAL", startDate: "", endDate: "", reason: "" });
      onApplied();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for leave">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}>
            {(Object.keys(typeLabel) as LeaveType[]).map((t) => (
              <option key={t} value={t}>
                {typeLabel[t]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input type="date" required min={todayYmd()} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })} />
          </Field>
          <Field label="To">
            <Input type="date" required min={form.startDate || todayYmd()} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Reason">
          <Textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        <p className="text-xs text-muted">Weekends are not counted.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Submit request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
