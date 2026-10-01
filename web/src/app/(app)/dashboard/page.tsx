"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, ArrowRight, Award, Briefcase, CalendarClock, CalendarX, Clock, FolderKanban, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { ActivityFeed, PriorityBadge, ProjectCard } from "@/components/shared";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatCard } from "@/components/ui";
import { BannerChip, WelcomeBanner } from "@/components/welcome-banner";
import { formatDate, formatTime, taskStatusLabel } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { Activity, AttendanceRecord, LeaveBalance, Milestone, Priority, ProjectSummary, Role, TaskStatus, TeamColor } from "@/lib/types";
import { teamColor } from "@/lib/team-colors";

interface StaffDashboard {
  role: Exclude<Role, "CLIENT">;
  projects: ProjectSummary[];
  myTasks: { id: string; title: string; status: TaskStatus; priority: Priority; dueDate: string | null; project: { id: string; name: string } }[];
  myAttendance: AttendanceRecord | null;
  balance: LeaveBalance[];
  recentActivity: Activity[];
  team: { headcount: number; present: number; onLeave: number; absent: number; pendingLeaves: number; clients: number } | null;
}

interface ClientDashboard {
  role: "CLIENT";
  projects: ProjectSummary[];
  awaitingApproval: (Milestone & { project: { id: string; name: string } })[];
  trackRecord: { delivered: number; active: number; teams: number };
  workingTeams: { id: string; name: string; color: TeamColor; lead: { name: string } | null; _count: { members: number } }[];
  updates: Activity[];
}

const stackItems = (projects: ProjectSummary[]) =>
  projects.map((p) => ({ id: p.id, title: p.name, subtitle: p.client?.name ?? "Internal project", percent: p.progress.percent }));

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<StaffDashboard | ClientDashboard>("/dashboard");

  // Keep numbers fresh as work happens around the company.
  useEffect(() => {
    const socket = getSocket();
    const events = ["activity:new", "attendance:changed", "leave:changed"];
    events.forEach((e) => socket.on(e, reload));
    return () => events.forEach((e) => socket.off(e, reload));
  }, [reload]);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? "Could not load dashboard"} onRetry={reload} />;

  const firstName = user.name.split(" ")[0];
  return data.role === "CLIENT" ? <ClientView data={data} name={firstName} /> : <StaffView data={data} name={firstName} />;
}

function StaffView({ data, name }: { data: StaffDashboard; name: string }) {
  const active = data.projects.filter((p) => p.status !== "COMPLETED");
  return (
    <>
      <WelcomeBanner title={`${greeting()}, ${name}`} subtitle="Here's what's happening across your workspace today." projects={stackItems(active)}>
        <BannerChip>{data.myTasks.length} open task{data.myTasks.length === 1 ? "" : "s"}</BannerChip>
        <BannerChip>{active.length} active project{active.length === 1 ? "" : "s"}</BannerChip>
        {data.team && <BannerChip>{data.team.present} of {data.team.headcount} in today</BannerChip>}
      </WelcomeBanner>

      {!data.myAttendance && (
        <Link href="/attendance" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" /> You haven&apos;t checked in today.
          </span>
          <span className="flex items-center gap-1 font-medium">
            Check in <ArrowRight className="size-4" />
          </span>
        </Link>
      )}

      {data.team ? (
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StaggerItem>
            <StatCard label="Present today" value={`${data.team.present}/${data.team.headcount}`} hint={`${data.team.absent} not checked in`} icon={<UserCheck className="size-4" />} tone="emerald" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="On leave" value={data.team.onLeave} hint={`${data.team.pendingLeaves} requests waiting`} icon={<CalendarX className="size-4" />} tone="rose" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Active projects" value={active.length} hint={`${data.projects.length} total`} icon={<FolderKanban className="size-4" />} tone="sky" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Clients" value={data.team.clients} icon={<Briefcase className="size-4" />} tone="amber" />
          </StaggerItem>
        </Stagger>
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StaggerItem>
            <StatCard
              label="Today"
              value={data.myAttendance ? formatTime(data.myAttendance.checkIn) : "Not in"}
              hint={data.myAttendance ? (data.myAttendance.status === "LATE" ? "Checked in late" : "Checked in on time") : "Check in from Attendance"}
              icon={<Clock className="size-4" />}
              tone="emerald"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Open tasks" value={data.myTasks.length} icon={<FolderKanban className="size-4" />} tone="sky" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="My projects" value={active.length} icon={<Users className="size-4" />} tone="violet" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label="Casual leave left" value={data.balance.find((b) => b.type === "CASUAL")?.remaining ?? 0} icon={<CalendarClock className="size-4" />} tone="amber" />
          </StaggerItem>
        </Stagger>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="My open tasks" action={<Link href="/my-tasks" className="text-sm font-medium text-brand">View all</Link>} />
            {data.myTasks.length === 0 ? (
              <EmptyState title="Nothing assigned to you" description="Tasks assigned to you across projects show up here." />
            ) : (
              <ul className="divide-y divide-line">
                {data.myTasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/projects/${t.project.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted">
                          {t.project.name} · due {formatDate(t.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <Badge>{taskStatusLabel[t.status]}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projects</h2>
              <Link href="/projects" className="text-sm font-medium text-brand">
                All projects
              </Link>
            </div>
            {active.length === 0 ? (
              <Card>
                <EmptyState title="No active projects" />
              </Card>
            ) : (
              <Stagger className="grid gap-4 sm:grid-cols-2">
                {active.slice(0, 4).map((p) => (
                  <StaggerItem key={p.id}>
                    <ProjectCard project={p} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </div>

        <Card className="self-start">
          <CardHeader title="Recent activity" subtitle="Live" />
          <ActivityFeed items={data.recentActivity} showProject />
        </Card>
      </div>
    </>
  );
}

function ClientView({ data, name }: { data: ClientDashboard; name: string }) {
  return (
    <>
      <WelcomeBanner title={`${greeting()}, ${name}`} subtitle="Live status of everything we're building for you." projects={stackItems(data.projects)}>
        <BannerChip>{data.projects.length} project{data.projects.length === 1 ? "" : "s"}</BannerChip>
        {data.awaitingApproval.length > 0 && <BannerChip>{data.awaitingApproval.length} waiting for your approval</BannerChip>}
      </WelcomeBanner>

      {data.awaitingApproval.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60">
          <CardHeader title="Waiting for your approval" subtitle="Review the delivered work and approve or request changes." />
          <ul className="divide-y divide-amber-100">
            {data.awaitingApproval.map((m) => (
              <li key={m.id}>
                <Link href={`/projects/${m.project.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-amber-50">
                  <span>
                    <span className="font-medium">{m.title}</span> <span className="text-muted">· {m.project.name}</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-amber-800">
                    Review <ArrowRight className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Projects delivered" value={data.trackRecord.delivered} hint="By this company, to date" icon={<Award className="size-4" />} tone="emerald" />
            <StatCard label="In delivery now" value={data.trackRecord.active} hint="Active across all clients" icon={<FolderKanban className="size-4" />} tone="sky" />
            <StatCard label="Teams you can hire" value={data.trackRecord.teams} hint="Browse their services" icon={<Users className="size-4" />} tone="violet" />
          </div>
          {data.workingTeams.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="Teams working for you" />
              <ul className="divide-y divide-line">
                {data.workingTeams.map((t) => (
                  <li key={t.id}>
                    <Link href={`/teams/${t.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-canvas">
                      <span className="flex items-center gap-2.5">
                        <span className={`size-2.5 rounded-full ${teamColor[t.color].dot}`} />
                        <span className="font-medium">{t.name}</span>
                        {t.lead && <span className="text-muted">· led by {t.lead.name}</span>}
                      </span>
                      <span className="text-muted">{t._count.members} people</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <h2 className="mb-3 text-sm font-semibold">Your projects</h2>
          {data.projects.length === 0 ? (
            <Card>
              <EmptyState title="No projects yet" description="Projects will appear here once the team sets them up." />
            </Card>
          ) : (
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {data.projects.map((p) => (
                <StaggerItem key={p.id}>
                  <ProjectCard project={p} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
        <div className="space-y-6 self-start">
        <Link href="/teams" className="group relative block overflow-hidden rounded-2xl bg-night p-5 text-white">
          <div className="absolute inset-0 bg-grid" />
          <div className="relative">
            <p className="text-sm font-semibold">Need something new?</p>
            <p className="mt-1 text-sm text-white/60">Browse our teams, see what each one offers and send a request.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300">
              Explore teams <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
        <Card>
          <CardHeader title="Latest updates" />
          <ActivityFeed items={data.updates} showProject empty="No updates yet" />
        </Card>
        </div>
      </div>
    </>
  );
}
