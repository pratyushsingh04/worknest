import type { Progress, ProjectStatus, RequestStatus, TeamColor, TeamService } from "./types";

export const SIZE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
export type SizeRange = (typeof SIZE_RANGES)[number];

/** The public profile a company fills in for clients. */
export interface CompanyProfile {
  tagline: string | null;
  about: string | null;
  industry: string | null;
  specialities: string[];
  offerings: string[];
  website: string | null;
  city: string | null;
  country: string | null;
  foundedYear: number | null;
  sizeRange: SizeRange | null;
  contactEmail: string | null;
}

export interface CompanyCard extends CompanyProfile {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  people: number;
  teams: number;
  delivered: number;
}

export interface ShowcaseTeam {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  color: TeamColor;
  skills: string[];
  lead: { id: string; name: string; designation: string | null } | null;
  members: { user: { id: string; name: string; designation: string | null } }[];
  services: TeamService[];
  projectsDelivered: number;
}

export interface CompanyPage {
  company: CompanyProfile & { id: string; slug: string; name: string; createdAt: string };
  teams: ShowcaseTeam[];
  people: { id: string; name: string; designation: string | null; department: string | null; isLeadership: boolean }[];
  trackRecord: { delivered: number; active: number; clients: number; people: number; teams: number };
  mine: {
    projects: { id: string; name: string; status: ProjectStatus; dueDate: string | null; team: { id: string; name: string; color: TeamColor } | null; progress: Progress }[];
    requests: { id: string; title: string; status: RequestStatus; team: { name: string }; createdAt: string }[];
  };
}

export interface ClientProject {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: string | null;
  startDate: string | null;
  company: { id: string; name: string; slug: string };
  team: { id: string; name: string; color: TeamColor; lead: { name: string } | null; _count: { members: number } } | null;
  progress: Progress;
  lastUpdate: { message: string; createdAt: string; actor: { name: string } | null } | null;
}

export interface ClientHome {
  projects: ClientProject[];
  awaitingApproval: { id: string; title: string; dueDate: string | null; project: { id: string; name: string; company: { name: string } } }[];
  updates: { id: string; message: string; createdAt: string; actor: { id: string; name: string } | null; project: { id: string; name: string; company: { name: string } } | null }[];
  requests: { id: string; title: string; status: RequestStatus; createdAt: string; company: { name: string; slug: string }; team: { name: string } }[];
  needs: { id: string; title: string; createdAt: string; proposals: number }[];
  newest: CompanyCard[];
  totals: { companies: number; active: number; delivered: number };
}

export type ProposalStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface Proposal {
  id: string;
  message: string;
  status: ProposalStatus;
  createdAt: string;
  company: { id: string; name: string; slug: string; tagline: string | null; city: string | null; country: string | null; industry: string | null };
  team: { id: string; name: string; color: TeamColor };
  author: { name: string; designation?: string | null } | null;
}

export interface Need {
  id: string;
  title: string;
  details: string;
  category: string | null;
  budget: string | null;
  deadline: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
}

/** A client's own need, with every company's answer. */
export interface MyNeed extends Need {
  proposals: Proposal[];
}

/** An open need as a company sees it: who is asking, and whether we have answered. */
export interface Lead extends Need {
  client: { id: string; name: string; email: string; phone: string | null; organisation: string | null; bio: string | null };
  myProposal: (Pick<Proposal, "id" | "message" | "status" | "createdAt" | "team"> & { author: { name: string } | null }) | null;
  proposalCount: number;
}
