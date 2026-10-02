"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, ArrowRight, Briefcase, CalendarClock, CalendarX, Clock, FolderKanban, Sparkles, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { ActivityFeed, PriorityBadge, ProjectCard } from "@/components/shared";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatCard } from "@/components/ui";
import { BannerChip, WelcomeBanner } from "@/components/welcome-banner";
import { formatDate, formatTime, taskStatusLabel } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { Activity, AttendanceRecord, LeaveBalance, Priority, ProjectSummary, Role, TaskStatus } from "@/lib/types";

interface StaffDashboard {
  role: Exclude<Role, "CLIENT">;
  /** Admins only: whether clients can find the company, and what is missing if not. */
  listing: { isListed: boolean; missing: string[] } | null;
  projects: ProjectSummary[];
  myTasks: { id: string; title: string; status: TaskStatus; priority: Priority; dueDate: string | null; project: { id: string; name: string } }[];
  myAttendance: AttendanceRecord | null;
  balance: LeaveBalance[];
  recentActivity: Activity[];
  team: { headcount: number; present: number; onLeave: number; absent: number; pendingLeaves: number; clients: number } | null;
}

const stackItems = (projects: ProjectSummary[]) =>
  projects.map((p) => ({ id: p.id, title: p.name, subtitle: p.client?.name ?? "Internal project", percent: p.progress.percent }));

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<StaffDashboard>("/dashboard");

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
  return <StaffView data={data} name={firstName} />;
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

      {data.listing && !data.listing.isListed && (
        <Link href="/settings#profile" className="mb-6 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-brand-soft px-5 py-4 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <span className="font-semibold">Clients can&apos;t see your company yet.</span> Finish your public profile to appear in the client directory. Still needed: {data.listing.missing.join(", ").toLowerCase()}.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium text-brand">
            Complete profile <ArrowRight className="size-4" />
          </span>
        </Link>
      )}

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
