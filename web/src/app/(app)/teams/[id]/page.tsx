"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, FolderKanban, Pencil, Plus, Trash2, UserCog, Users } from "lucide-react";
import { Stagger, StaggerItem, easeOut } from "@/components/motion";
import { PriorityBadge, ProjectStatusBadge } from "@/components/shared";
import { TeamStatPill } from "@/components/teams/team-cards";
import { MembersModal, ServiceFormModal, TeamFormModal } from "@/components/teams/team-forms";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, FormError, Input, PageLoader, ProgressBar, Select, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, taskStatusLabel } from "@/lib/format";
import { formatINR, teamColor } from "@/lib/team-colors";
import { useApi } from "@/lib/use-api";
import type { Priority, Progress, ProjectStatus, TaskStatus, TeamColor, TeamService, UserBrief } from "@/lib/types";

interface TeamDetail {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  color: TeamColor;
  skills: string[];
  visibleToClients: boolean;
  leadId: string | null;
  lead: UserBrief | null;
  members: { user: UserBrief; openTasks: number }[];
  services: TeamService[];
  projects: { id: string; name: string; status: ProjectStatus; dueDate: string | null; client: { id: string; name: string } | null; progress: Progress }[];
  recentTasks: { id: string; title: string; status: TaskStatus; priority: Priority; assignee: { id: string; name: string } | null; project: { id: string; name: string } }[];
}


function TeamHero({ name, tagline, color, children, badge }: { name: string; tagline: string | null; color: TeamColor; children?: React.ReactNode; badge?: React.ReactNode }) {
  const c = teamColor[color];
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      style={{ transformPerspective: 1200 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className={clsx("relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-8 text-white sm:px-8", c.gradient)}
    >
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="relative">
        {badge}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{name}</h1>
        {tagline && <p className="mt-1 text-white/80">{tagline}</p>}
        {children && <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </motion.section>
  );
}

// ---- Staff: the team's workspace ----------------------------------------------

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ team: TeamDetail; permissions: { canManage: boolean; canEditLead: boolean } }>(`/teams/${id}`);
  const [editing, setEditing] = useState(false);
  const [managingMembers, setManagingMembers] = useState(false);
  const [serviceForm, setServiceForm] = useState<TeamService | "new" | null>(null);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? "Could not load team"} onRetry={reload} />;
  const { team, permissions } = data;
  const people = team.members.map((m) => m.user);

  async function deleteService(s: TeamService) {
    if (!confirm(`Remove "${s.title}" from ${team.name}'s services?`)) return;
    try {
      await api.del(`/teams/${team.id}/services/${s.id}`);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function deleteTeam() {
    if (!confirm(`Delete the ${team.name} team? Its projects stay, but lose the team link.`)) return;
    try {
      await api.del(`/teams/${team.id}`);
      router.replace("/teams");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <>
      <Link href="/teams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Teams
      </Link>
      <TeamHero
        name={team.name}
        tagline={team.tagline}
        color={team.color}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-xs">
            {team.visibleToClients ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {team.visibleToClients ? "Visible in the client portal" : "Internal only"}
          </span>
        }
      >
        <TeamStatPill icon={UserCog}>{team.lead ? `Lead: ${team.lead.name}` : "No lead yet"}</TeamStatPill>
        <TeamStatPill icon={Users}>{people.length} people</TeamStatPill>
        <TeamStatPill icon={FolderKanban}>{team.projects.length} projects</TeamStatPill>
        {permissions.canManage && (
          <button onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-white/90">
            <Pencil className="size-3.5" /> Edit profile
          </button>
        )}
      </TeamHero>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {permissions.canManage && <AssignTask team={team} onAssigned={reload} />}

          <Card>
            <CardHeader title="Projects" subtitle="Everything this team is delivering" />
            {team.projects.length === 0 ? (
              <EmptyState title="No projects yet" description="Assign a project to this team, or convert a client request into one." />
            ) : (
              <ul className="divide-y divide-line">
                {team.projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-canvas sm:grid-cols-[1.3fr_1fr_auto]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.client?.name ?? "Internal"} · due {formatDate(p.dueDate)}
                        </p>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        <ProgressBar percent={p.progress.percent} />
                        <span className="w-9 text-right text-sm font-medium tabular-nums">{p.progress.percent}%</span>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent tasks" />
            {team.recentTasks.length === 0 ? (
              <EmptyState title="No tasks yet" />
            ) : (
              <ul className="divide-y divide-line">
                {team.recentTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted">
                        {t.project.name} · {t.assignee?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <Badge tone={t.status === "DONE" ? "green" : "gray"}>{taskStatusLabel[t.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Members"
              subtitle="Open tasks per person"
              action={
                permissions.canManage && (
                  <Button size="sm" variant="secondary" onClick={() => setManagingMembers(true)}>
                    Manage
                  </Button>
                )
              }
            />
            <Stagger as="ul" className="divide-y divide-line">
              {team.members.map((m) => (
                <StaggerItem as="li" key={m.user.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={m.user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.user.name} {m.user.id === team.leadId && <Badge tone="purple">Lead</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.user.designation ?? "Team member"}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{m.openTasks}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </Card>

          <Card>
            <CardHeader
              title="Services"
              subtitle={team.visibleToClients ? "Shown to clients" : "Hidden from clients"}
              action={
                permissions.canManage && (
                  <Button size="sm" variant="secondary" onClick={() => setServiceForm("new")}>
                    <Plus className="size-3.5" /> Add
                  </Button>
                )
              }
            />
            {team.services.length === 0 ? (
              <EmptyState title="No services listed" description="List what this team offers so clients can request it." />
            ) : (
              <ul className="divide-y divide-line">
                {team.services.map((s) => (
                  <li key={s.id} className="group flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted">
                        {[s.turnaround, s.startingPrice != null ? `from ${formatINR(s.startingPrice)}` : null].filter(Boolean).join(" · ") || "No pricing"}
                      </p>
                    </div>
                    {permissions.canManage && (
                      <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setServiceForm(s)} className="rounded-md p-1 text-muted hover:bg-canvas hover:text-ink" aria-label={`Edit ${s.title}`}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => deleteService(s)} className="rounded-md p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${s.title}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {team.skills.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 text-sm font-semibold">Skills &amp; tools</p>
              <div className="flex flex-wrap gap-1.5">
                {team.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </Card>
          )}

          {permissions.canEditLead && (
            <button onClick={deleteTeam} className="w-full rounded-xl py-2 text-sm text-muted transition-colors hover:bg-red-50 hover:text-red-600">
              Delete this team
            </button>
          )}
        </div>
      </div>

      {editing && (
        <TeamFormModal
          canEditLead={permissions.canEditLead}
          initial={{
            id: team.id,
            name: team.name,
            tagline: team.tagline ?? "",
            description: team.description ?? "",
            color: team.color,
            leadId: team.leadId ?? "",
            skills: team.skills,
            visibleToClients: team.visibleToClients,
            memberIds: [],
          }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
      {managingMembers && (
        <MembersModal
          teamId={team.id}
          leadId={team.leadId}
          current={people.map((p) => p.id)}
          onClose={() => setManagingMembers(false)}
          onSaved={() => {
            setManagingMembers(false);
            reload();
          }}
        />
      )}
      {serviceForm && (
        <ServiceFormModal
          teamId={team.id}
          service={serviceForm === "new" ? undefined : serviceForm}
          onClose={() => setServiceForm(null)}
          onSaved={() => {
            setServiceForm(null);
            reload();
          }}
        />
      )}
    </>
  );
}

/** Lets the team lead hand a task to a team member in one step. */
function AssignTask({ team, onAssigned }: { team: TeamDetail; onAssigned: () => void }) {
  const toast = useToast();
  const active = team.projects.filter((p) => p.status !== "COMPLETED");
  const [form, setForm] = useState({ projectId: active[0]?.id ?? "", assigneeId: "", title: "", priority: "MEDIUM" as Priority, dueDate: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/tasks", { projectId: form.projectId, assigneeId: form.assigneeId || null, title: form.title, priority: form.priority, dueDate: form.dueDate || null });
      const who = team.members.find((m) => m.user.id === form.assigneeId)?.user.name;
      toast(who ? `Assigned "${form.title}" to ${who}` : `Created "${form.title}"`);
      setForm({ ...form, title: "", dueDate: "" });
      onAssigned();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Assign a task" subtitle="Hand work to someone on the team" />
      {active.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">This team has no active projects yet. Create a project for the team, or convert a client request, to start assigning tasks.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <FormError message={error} />
          <Field label="Task">
            <Input required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Build the rider list screen" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Project">
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assign to">
              <Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {team.members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
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
            <Field label="Due">
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <CheckCircle2 className="size-4" /> Assign task
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ---- Client: the team's public profile ------------------------------------------
