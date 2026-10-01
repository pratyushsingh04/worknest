"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ProjectCard } from "@/components/shared";
import { Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, PageLoader, Select, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { projectStatusLabel } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { ClientOrg, ProjectStatus, ProjectSummary, Staff, TeamSummary } from "@/lib/types";

const filters: (ProjectStatus | "ALL")[] = ["ALL", "ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED"];

export default function ProjectsPage() {
  const { user, hasRole } = useAuth();
  const { data, error, loading, reload } = useApi<{ projects: ProjectSummary[] }>("/projects");
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [creating, setCreating] = useState(false);
  const canCreate = hasRole("ADMIN", "MANAGER");

  const projects = useMemo(() => (data?.projects ?? []).filter((p) => filter === "ALL" || p.status === filter), [data, filter]);

  return (
    <>
      <PageHeader icon={FolderKanban}
        title={user.role === "CLIENT" ? "Your projects" : "Projects"}
        description={user.role === "CLIENT" ? "Track progress on everything we're delivering for you." : "Everything your teams are delivering."}
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New project
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink"}`}
          >
            {f === "ALL" ? "All" : projectStatusLabel[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects here yet"
            description={canCreate ? "Create a project, add your team and start tracking work." : undefined}
            action={canCreate && <Button onClick={() => setCreating(true)}>New project</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {canCreate && <CreateProjectModal open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const staff = useApi<{ users: Staff[] }>(open ? "/users" : null);
  const clients = useApi<{ clients: ClientOrg[] }>(open ? "/clients" : null);
  const teams = useApi<{ teams: TeamSummary[] }>(open ? "/teams" : null);
  const [form, setForm] = useState({ name: "", description: "", clientId: "", teamId: "", managerId: "", status: "ACTIVE", startDate: "", dueDate: "" });
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeStaff = (staff.data?.users ?? []).filter((u) => u.isActive);
  const managers = activeStaff.filter((u) => u.role !== "EMPLOYEE");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { project } = await api.post<{ project: { id: string } }>("/projects", {
        name: form.name,
        description: form.description || undefined,
        clientId: form.clientId || null,
        teamId: form.teamId || null,
        managerId: user.role === "ADMIN" && form.managerId ? form.managerId : undefined,
        status: form.status,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        memberIds: members,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Project name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer mobile app" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team" hint="The whole team joins the project; its lead can assign tasks">
            <Select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">No team</option>
              {teams.data?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.lead ? ` (lead: ${t.lead.name})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Client" hint="The client can follow this project from their portal">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Internal (no client)</option>
              {clients.data?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {user.role === "ADMIN" && (
            <Field label="Project manager">
              <Select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                <option value="">Me</option>
                {managers
                  .filter((m) => m.id !== user.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <Field label="Start date">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Team">
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-line p-2 scroll-thin">
            {activeStaff.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-canvas">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={members.includes(u.id)}
                  onChange={(e) => setMembers(e.target.checked ? [...members, u.id] : members.filter((id) => id !== u.id))}
                />
                {u.name} <span className="text-muted">· {u.designation ?? u.role.toLowerCase()}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
