"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, Copy, Inbox, Link2, MailCheck } from "lucide-react";
import { clsx } from "clsx";
import { Button, Field, FormError, Input, Modal, Select, useToast } from "./ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ClientOrg, ProjectSummary, Role, Staff } from "@/lib/types";

export type EmailStatus = "SENT" | "FAILED" | "OUTBOX";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't access the clipboard. Select the link and copy it manually.", "error");
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pl-3">
      <Link2 className="size-4 shrink-0 text-muted" />
      <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" aria-label="Invite link" />
      <Button size="sm" variant={copied ? "success" : "primary"} onClick={copy} type="button">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

/** Explains what happened to the invite email, with the right next step. */
export function EmailStatusNote({ status, to }: { status: EmailStatus; to: string }) {
  if (status === "SENT") {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-sm text-emerald-800 ring-1 ring-emerald-200/70">
        <MailCheck className="mt-0.5 size-4 shrink-0" /> Email sent to <b>{to}</b>. You can also share the link below directly.
      </p>
    );
  }
  if (status === "FAILED") {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm text-red-800 ring-1 ring-red-200/70">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" /> The email couldn&apos;t be delivered. Copy the link below and send it yourself. Details are in Admin console → Emails.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900 ring-1 ring-amber-200/70">
      <Inbox className="mt-0.5 size-4 shrink-0" /> Email sending isn&apos;t set up yet, so the email was saved to Admin console → Emails. Copy the link and send it on WhatsApp or email.
    </p>
  );
}

/** Creates a one-time invite link and emails it. Mount it only while open so each invite starts fresh. */
export function InviteModal({ onClose, onCreated, defaultRole = "EMPLOYEE", defaultClientId }: { onClose: () => void; onCreated?: () => void; defaultRole?: Role; defaultClientId?: string }) {
  const [form, setForm] = useState({ email: "", name: "", role: defaultRole, designation: "", department: "", managerId: "", clientId: defaultClientId ?? "" });
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ link: string; emailStatus: EmailStatus } | null>(null);
  const isClient = form.role === "CLIENT";

  const clients = useApi<{ clients: ClientOrg[] }>(isClient ? "/clients" : null);
  const staff = useApi<{ users: Staff[] }>(isClient ? null : "/users");
  const projects = useApi<{ projects: ProjectSummary[] }>(isClient ? null : "/projects");

  const managers = (staff.data?.users ?? []).filter((u) => u.isActive && u.role !== "EMPLOYEE");
  const departments = useMemo(() => [...new Set((staff.data?.users ?? []).map((u) => u.department).filter((d): d is string => !!d))].sort(), [staff.data]);
  const openProjects = (projects.data?.projects ?? []).filter((p) => p.status !== "COMPLETED");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ link: string; emailStatus: EmailStatus }>("/invites", {
        email: form.email,
        name: form.name || undefined,
        role: form.role,
        ...(isClient
          ? { clientId: form.clientId }
          : { designation: form.designation || undefined, department: form.department || undefined, managerId: form.managerId || undefined, projectIds }),
      });
      setResult(res);
      onCreated?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <Modal open onClose={onClose} title={result ? "Invite sent" : "Invite someone"} wide={!result}>
      {result ? (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            style={{ transformPerspective: 600 }}
            className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.div>
          <p className="mt-4 font-medium">{form.name || form.email} is invited</p>
          <p className="mt-1 text-sm text-muted">The link works once and expires in 7 days.</p>
          <div className="mt-5 space-y-3">
            <EmailStatusNote status={result.emailStatus} to={form.email} />
            <CopyLink link={result.link} />
          </div>
          <Button variant="secondary" className="mt-5 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input type="email" required autoFocus value={form.email} onChange={set("email")} placeholder="name@company.com" />
            </Field>
            <Field label="Name (optional)">
              <Input value={form.name} onChange={set("name")} />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Access</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["EMPLOYEE", "MANAGER", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={clsx(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                    form.role === r ? "border-brand bg-brand-soft/60 ring-4 ring-brand/10" : "border-line hover:border-brand/40",
                  )}
                >
                  <span className="block font-medium">{{ EMPLOYEE: "Employee", MANAGER: "Manager", ADMIN: "Admin" }[r]}</span>
                  <span className="block text-xs text-muted">{{ EMPLOYEE: "Tasks & HR", MANAGER: "Runs projects", ADMIN: "Everything" }[r]}</span>
                </button>
              ))}
            </div>
          </div>

          {isClient ? (
            <Field label="Which client are they from?">
              <Select required value={form.clientId} onChange={set("clientId")}>
                <option value="">Choose…</option>
                {clients.data?.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Designation">
                  <Input value={form.designation} onChange={set("designation")} placeholder="QA Engineer" />
                </Field>
                <Field label="Department">
                  <Input list="departments" value={form.department} onChange={set("department")} placeholder="Engineering" />
                  <datalist id="departments">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Reports to">
                  <Select value={form.managerId} onChange={set("managerId")}>
                    <option value="">No one</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {openProjects.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Add to projects <span className="font-normal text-muted">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {openProjects.map((p) => {
                      const on = projectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProjectIds(on ? projectIds.filter((id) => id !== p.id) : [...projectIds, p.id])}
                          className={clsx(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                            on ? "border-transparent bg-brand-gradient text-white shadow-md" : "border-line text-ink hover:border-brand/40",
                          )}
                        >
                          {on && <Check className="size-3.5" />} {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Send invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
