"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, CalendarDays, Radio } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Board } from "@/components/project/board";
import { Discussion } from "@/components/project/discussion";
import { Milestones } from "@/components/project/milestones";
import { TaskModal } from "@/components/project/task-modal";
import { Team } from "@/components/project/team";
import { ActivityFeed, ProjectStatusBadge } from "@/components/shared";
import { Avatar, Card, ErrorState, PageLoader, ProgressBar, Select, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, projectStatusLabel } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import type { Activity, Progress, ProjectDetail, ProjectStatus, Task, TaskStatus } from "@/lib/types";

interface DetailResponse {
  project: ProjectDetail;
  permissions: { canManage: boolean; isClient: boolean };
}

type Tab = "board" | "milestones" | "activity" | "discussion" | "team";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const isClient = user.role === "CLIENT";

  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>(isClient ? "milestones" : "board");
  const [taskModal, setTaskModal] = useState<{ task: Task | null; status?: TaskStatus } | null>(null);
  const [live, setLive] = useState(false);

  const fetchAll = useCallback(
    () =>
      Promise.all([api.get<DetailResponse>(`/projects/${id}`), api.get<{ activities: Activity[] }>(`/projects/${id}/activity`)]).then(
        ([detail, feed]) => {
          setData(detail);
          setActivity(feed.activities);
          setError(null);
        },
        (err) => setError(errorMessage(err)),
      ),
    [id],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setTasks = useCallback((updater: (tasks: Task[]) => Task[]) => {
    setData((d) => (d ? { ...d, project: { ...d.project, tasks: updater(d.project.tasks) } } : d));
  }, []);

  // Realtime: everyone looking at this project sees the same board.
  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit("project:join", id);
      setLive(true);
    };
    const onDisconnect = () => setLive(false);
    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);

    const upsert = (task: Task & { projectId?: string }) => {
      if (task.projectId && task.projectId !== id) return;
      setTasks((ts) => (ts.some((t) => t.id === task.id) ? ts.map((t) => (t.id === task.id ? { ...t, ...task } : t)) : [...ts, task]));
    };
    const remove = ({ id: taskId }: { id: string }) => setTasks((ts) => ts.filter((t) => t.id !== taskId));
    const onProgress = (p: { projectId: string; progress: Progress }) => {
      if (p.projectId !== id) return;
      setData((d) => (d ? { ...d, project: { ...d.project, progress: p.progress } } : d));
    };
    const onActivity = (a: Activity & { projectId?: string }) => {
      if (a.projectId !== id) return;
      setActivity((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
    };
    const onUpdated = (p: { projectId: string }) => p.projectId === id && fetchAll();

    socket.on("task:created", upsert);
    socket.on("task:updated", upsert);
    socket.on("task:deleted", remove);
    socket.on("project:progress", onProgress);
    socket.on("activity:new", onActivity);
    socket.on("project:updated", onUpdated);
    return () => {
      socket.emit("project:leave", id);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("task:created", upsert);
      socket.off("task:updated", upsert);
      socket.off("task:deleted", remove);
      socket.off("project:progress", onProgress);
      socket.off("activity:new", onActivity);
      socket.off("project:updated", onUpdated);
    };
  }, [id, fetchAll, setTasks]);

  if (error) return <ErrorState message={error} onRetry={fetchAll} />;
  if (!data) return <PageLoader />;

  const { project, permissions } = data;
  const members = project.members.map((m) => m.user);

  async function changeStatus(status: ProjectStatus) {
    try {
      await api.patch(`/projects/${project.id}`, { status });
      setData((d) => (d ? { ...d, project: { ...d.project, status } } : d));
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  const tabs: { key: Tab; label: string }[] = isClient
    ? [
        { key: "milestones", label: "Milestones" },
        { key: "activity", label: "Updates" },
        { key: "discussion", label: "Discussion" },
      ]
    : [
        { key: "board", label: "Board" },
        { key: "milestones", label: "Milestones" },
        { key: "activity", label: "Activity" },
        { key: "discussion", label: "Client discussion" },
        { key: "team", label: "Team" },
      ];

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              {!permissions.canManage && <ProjectStatusBadge status={project.status} />}
              <span className={clsx("inline-flex items-center gap-1 text-xs", live ? "text-emerald-600" : "text-muted")} title={live ? "Updates appear instantly" : "Reconnecting…"}>
                <Radio className="size-3.5" /> {live ? "Live" : "Offline"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {project.client ? `For ${project.client.name}` : "Internal project"}
              {project.manager && ` · Managed by ${project.manager.name}`}
            </p>
            {project.description && <p className="mt-3 max-w-2xl text-sm text-ink/80">{project.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {permissions.canManage && (
              <Select className="h-9 w-36" value={project.status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)}>
                {(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {projectStatusLabel[s]}
                  </option>
                ))}
              </Select>
            )}
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <span key={m.id} className="rounded-full ring-2 ring-surface">
                  <Avatar name={m.name} />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm text-muted">
                {project.progress.done} of {project.progress.total} tasks complete · {project.progress.inProgress} in progress
              </span>
              <span className="text-2xl font-semibold tracking-tight">{project.progress.percent}%</span>
            </div>
            <ProgressBar percent={project.progress.percent} className="h-2.5" />
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-muted">Started</p>
              <p className="font-medium">{formatDate(project.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Due</p>
              <p className="inline-flex items-center gap-1 font-medium">
                <CalendarDays className="size-3.5 text-muted" /> {formatDate(project.dueDate)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line scroll-thin">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "board" && (
        <Board
          tasks={project.tasks}
          milestones={project.milestones}
          canManage={permissions.canManage}
          onTasksChange={setTasks}
          onOpenTask={(task) => setTaskModal({ task })}
          onAddTask={(status) => setTaskModal({ task: null, status })}
        />
      )}
      {tab === "milestones" && (
        <Milestones projectId={project.id} milestones={project.milestones} tasks={project.tasks} canManage={permissions.canManage} isClient={isClient} />
      )}
      {tab === "activity" && (
        <Card>
          <ActivityFeed items={activity} empty={isClient ? "No updates yet" : "No activity yet"} />
        </Card>
      )}
      {tab === "discussion" && <Discussion projectId={project.id} />}
      {tab === "team" && <Team project={project} canManage={permissions.canManage} />}

      {!isClient && taskModal && (
        <TaskModal
          key={taskModal.task?.id ?? `new-${taskModal.status}`}
          open
          onClose={() => setTaskModal(null)}
          projectId={project.id}
          task={taskModal.task}
          defaultStatus={taskModal.status}
          canManage={permissions.canManage}
          members={members}
          milestones={project.milestones}
        />
      )}
    </>
  );
}
