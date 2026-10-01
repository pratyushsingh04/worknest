"use client";

import Link from "next/link";
import { AlertTriangle, Briefcase, CalendarX, FolderKanban, KeyRound, ListChecks, ShieldAlert, UserCheck } from "lucide-react";
import { BarList, ColumnChart, SERIES } from "@/components/charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { ProjectStatusBadge } from "@/components/shared";
import { Avatar, Badge, Card, CardHeader, ErrorState, PageLoader, ProgressBar, StatCard } from "@/components/ui";
import { formatDate, roleLabel, taskStatusLabel, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Progress, ProjectStatus, Role, TaskStatus } from "@/lib/types";

export interface LoginRow {
  id: string;
  email: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string; role: Role } | null;
}

interface Overview {
  kpis: {
    headcount: number;
    clients: number;
    activeProjects: number;
    avgProgress: number;
    openTasks: number;
    overdueTasks: number;
    presentToday: number;
    onLeaveToday: number;
    pendingLeaves: number;
    pendingInvites: number;
    failedLogins7d: number;
  };
  attendanceTrend: { date: string; onTime: number; late: number }[];
  tasksByStatus: { status: TaskStatus; count: number }[];
  projects: { id: string; name: string; status: ProjectStatus; dueDate: string | null; client: { name: string } | null; progress: Progress; overdue: boolean }[];
  departments: { department: string; count: number }[];
  leaveByType: { type: string; days: number }[];
  workload: { user: { id: string; name: string; designation: string | null }; openTasks: number }[];
  recentLogins: LoginRow[];
}

const shortDay = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function deviceFromUA(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /curl/i.test(ua) ? "curl" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function AdminOverview() {
  const { data, error, loading, reload } = useApi<Overview>("/admin/overview");
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? "Could not load overview"} onRetry={reload} />;
  const k = data.kpis;
  const leaveLabel: Record<string, string> = { CASUAL: "Casual", SICK: "Sick", EARNED: "Earned", UNPAID: "Unpaid" };

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label="Team size" value={k.headcount} hint={`${k.clients} clients`} icon={<Briefcase className="size-4" />} tone="violet" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="In today" value={k.presentToday} hint={`${k.onLeaveToday} on leave · of ${k.headcount}`} icon={<UserCheck className="size-4" />} tone="emerald" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Active projects" value={k.activeProjects} hint={`${k.avgProgress}% average progress`} icon={<FolderKanban className="size-4" />} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Open tasks" value={k.openTasks} hint={k.overdueTasks ? `${k.overdueTasks} overdue` : "Nothing overdue"} icon={<ListChecks className="size-4" />} tone="amber" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Leave requests" value={k.pendingLeaves} hint="Waiting for approval" icon={<CalendarX className="size-4" />} tone="rose" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Pending invites" value={k.pendingInvites} hint="Not yet accepted" icon={<KeyRound className="size-4" />} tone="violet" />
        </StaggerItem>
        <StaggerItem className="col-span-2">
          <Card hover className="flex h-full items-center gap-4 p-5">
            <span className={`flex size-11 items-center justify-center rounded-xl ${k.failedLogins7d ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted">Failed sign-ins, last 7 days</p>
              <p className="text-2xl font-semibold">{k.failedLogins7d}</p>
            </div>
            <p className="ml-auto max-w-44 text-right text-xs text-muted">Accounts lock for 15 min after 8 failed attempts.</p>
          </Card>
        </StaggerItem>
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance, last 14 days" subtitle="People checked in each day" />
          <div className="p-5">
            <ColumnChart
              ariaLabel="Daily attendance for the last 14 days, split into on time and late"
              data={data.attendanceTrend.map((d) => ({ label: d.date, values: { onTime: d.onTime, late: d.late } }))}
              series={[
                { key: "onTime", label: "On time", color: SERIES.blue },
                { key: "late", label: "Late", color: SERIES.orange },
              ]}
              formatLabel={shortDay}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Tasks by status" subtitle="Across every project" />
          <div className="p-5">
            <BarList ariaLabel="Number of tasks in each status" items={data.tasksByStatus.map((t) => ({ label: taskStatusLabel[t.status], value: t.count }))} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Delivery health" subtitle="Every project, earliest deadline first" />
          <ul className="divide-y divide-line">
            {data.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-canvas sm:grid-cols-[1.4fr_1fr_auto]">
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
                  <div className="flex items-center gap-2">
                    {p.overdue && (
                      <Badge tone="red">
                        <AlertTriangle className="size-3" /> Overdue
                      </Badge>
                    )}
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Open tasks per person" subtitle="Who might be overloaded" />
          <div className="p-5">
            {data.workload.length ? (
              <BarList ariaLabel="Open tasks per person" items={data.workload.map((w) => ({ label: w.user.name, value: w.openTasks }))} />
            ) : (
              <p className="text-sm text-muted">No open tasks are assigned.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Team by department" />
          <div className="p-5">
            <BarList ariaLabel="Headcount per department" items={data.departments.map((d) => ({ label: d.department, value: d.count }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Leave taken this year" subtitle="Approved days by type" />
          <div className="p-5">
            <BarList ariaLabel="Approved leave days this year by type" items={data.leaveByType.map((l) => ({ label: leaveLabel[l.type], value: l.days }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Latest sign-ins" />
          <ul className="divide-y divide-line">
            {data.recentLogins.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={l.user?.name ?? l.email} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{l.user?.name ?? l.email}</p>
                  <p className="text-xs text-muted">
                    {l.user ? roleLabel[l.user.role] : "Unknown"} · {timeAgo(l.createdAt)}
                  </p>
                </div>
                <Badge tone={l.success ? "green" : "red"} dot>
                  {l.success ? "OK" : "Failed"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
