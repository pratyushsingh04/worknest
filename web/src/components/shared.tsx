"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatDate, leaveStatusLabel, milestoneStatusLabel, priorityLabel, projectStatusLabel, timeAgo } from "@/lib/format";
import type { Activity, LeaveStatus, MilestoneStatus, Priority, ProjectStatus, ProjectSummary } from "@/lib/types";
import { TiltCard } from "./motion";
import { Avatar, Badge, Card, EmptyState, ProgressBar, type Tone } from "./ui";

const projectTone: Record<ProjectStatus, Tone> = { PLANNING: "gray", ACTIVE: "blue", ON_HOLD: "amber", COMPLETED: "green" };
const milestoneTone: Record<MilestoneStatus, Tone> = {
  PENDING: "gray",
  IN_PROGRESS: "blue",
  AWAITING_APPROVAL: "amber",
  APPROVED: "green",
  CHANGES_REQUESTED: "red",
};
const leaveTone: Record<LeaveStatus, Tone> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const priorityTone: Record<Priority, Tone> = { LOW: "gray", MEDIUM: "blue", HIGH: "amber", URGENT: "red" };

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => <Badge tone={projectTone[status]}>{projectStatusLabel[status]}</Badge>;
export const LeaveStatusBadge = ({ status }: { status: LeaveStatus }) => <Badge tone={leaveTone[status]}>{leaveStatusLabel[status]}</Badge>;
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge tone={priorityTone[priority]}>{priorityLabel[priority]}</Badge>;
export function MilestoneStatusBadge({ status, forClient }: { status: MilestoneStatus; forClient?: boolean }) {
  const label = status === "AWAITING_APPROVAL" && !forClient ? "Awaiting client approval" : milestoneStatusLabel[status];
  return <Badge tone={milestoneTone[status]}>{label}</Badge>;
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <TiltCard className="relative h-full rounded-2xl" max={6}>
      <Card className="h-full p-5 transition-shadow duration-300 hover:border-gray-300 hover:shadow-[0_20px_40px_-26px_rgba(17,17,24,0.35)]">
        <div className="flex items-start justify-between gap-3 [transform:translateZ(30px)]">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{project.name}</h3>
            <p className="mt-0.5 truncate text-sm text-muted">{project.client?.name ?? "Internal project"}</p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted">
              {project.progress.done} of {project.progress.total} tasks done
            </span>
            <span className="font-semibold">{project.progress.percent}%</span>
          </div>
          <ProgressBar percent={project.progress.percent} />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> Due {formatDate(project.dueDate)}
          </span>
          {project.manager && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={project.manager.name} size="sm" /> {project.manager.name}
            </span>
          )}
        </div>
      </Card>
      </TiltCard>
    </Link>
  );
}

export function ActivityFeed({ items, showProject, empty = "No activity yet" }: { items: Activity[]; showProject?: boolean; empty?: string }) {
  if (items.length === 0) return <EmptyState title={empty} />;
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3 px-5 py-3">
          <Avatar name={a.actor?.name ?? "System"} size="sm" />
          <div className="min-w-0 flex-1 text-sm">
            <p>
              <span className="font-medium">{a.actor?.name ?? "Someone"}</span> <span className="text-ink/80">{a.message}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {timeAgo(a.createdAt)}
              {showProject && a.project && (
                <>
                  {" · "}
                  <Link href={`/projects/${a.project.id}`} className="hover:text-brand">
                    {a.project.name}
                  </Link>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
