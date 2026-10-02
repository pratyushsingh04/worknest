export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED";
export type LeaveType = "CASUAL" | "SICK" | "EARNED" | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  department: string | null;
  phone: string | null;
  /** A client's own business name. */
  organisation: string | null;
  bio: string | null;
  isPlatformAdmin: boolean;
  /** Null for clients, who belong to no company. */
  company: { id: string; name: string; slug: string; isListed: boolean } | null;
}

export interface UserBrief {
  id: string;
  name: string;
  designation?: string | null;
}

export interface Staff extends UserBrief {
  email: string;
  role: Role;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  joinedAt: string;
  manager: UserBrief | null;
}

export interface Progress {
  total: number;
  done: number;
  inProgress: number;
  percent: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate: string | null;
  client: { id: string; name: string } | null;
  manager: UserBrief | null;
  members?: { user: UserBrief }[];
  progress: Progress;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  clientNote: string | null;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: Priority;
  estimateHours?: number | null;
  dueDate?: string | null;
  position?: number;
  milestoneId: string | null;
  completedAt: string | null;
  assignee: UserBrief | null;
}

export interface ProjectDetail extends ProjectSummary {
  members: { user: UserBrief }[];
  milestones: Milestone[];
  tasks: Task[];
}

export interface Activity {
  id: string;
  message: string;
  createdAt: string;
  clientVisible: boolean;
  actor: UserBrief | null;
  project?: { id: string; name: string } | null;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: Role };
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: "PRESENT" | "LATE";
  distanceM: number | null;
}

export interface Leave {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  createdAt: string;
  user: UserBrief;
  reviewer: UserBrief | null;
}

export interface LeaveBalance {
  type: Exclude<LeaveType, "UNPAID">;
  allowed: number;
  used: number;
  remaining: number;
}

export interface ClientOrg {
  id: string;
  name: string;
  contactEmail: string | null;
  industry: string | null;
  /** The client's own WorkNest account, when they have one. */
  account: { id: string; name: string; email: string; phone: string | null; organisation: string | null } | null;
  projects: { id: string; name: string; status: ProjectStatus }[];
}

export interface Company {
  id: string;
  name: string;
  timezone: string;
  workStartTime: string;
  officeLat: number | null;
  officeLng: number | null;
  officeRadiusM: number;
  isListed: boolean;
  tagline: string | null;
  about: string | null;
  industry: string | null;
  specialities: string[];
  offerings: string[];
  website: string | null;
  city: string | null;
  country: string | null;
  foundedYear: number | null;
  sizeRange: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  contactEmail: string | null;
}

export type TeamColor = "indigo" | "emerald" | "sky" | "amber" | "rose" | "slate";

export interface TeamService {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  turnaround: string | null;
  startingPrice: number | null;
}

export interface TeamSummary {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  color: TeamColor;
  skills: string[];
  visibleToClients: boolean;
  lead: UserBrief | null;
  members: { user: UserBrief }[];
  services: TeamService[];
  _count: { services: number; projects: number; requests: number };
}

export type RequestStatus = "NEW" | "IN_REVIEW" | "ACCEPTED" | "DECLINED" | "CONVERTED";

export interface ServiceRequest {
  id: string;
  title: string;
  details: string;
  budget: string | null;
  deadline: string | null;
  status: RequestStatus;
  response: string | null;
  createdAt: string;
  client: { id: string; name: string; account: { id: string; name: string; email: string; phone: string | null; organisation: string | null } | null };
  company: { id: string; name: string; slug: string };
  team: { id: string; name: string; color: TeamColor; leadId: string | null };
  service: { id: string; title: string } | null;
  requestedBy: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}
