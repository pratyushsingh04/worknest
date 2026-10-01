import type { LeaveStatus, MilestoneStatus, Priority, ProjectStatus, Role, TaskStatus } from "./types";

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  CLIENT: "Client",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting your approval",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
};

export const leaveStatusLabel: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const priorityLabel: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Today's date as YYYY-MM-DD in the browser's timezone. */
export function todayYmd() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}
