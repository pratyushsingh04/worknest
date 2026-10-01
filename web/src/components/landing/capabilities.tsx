"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Clock3,
  FileSearch,
  FolderKanban,
  GanttChart,
  Globe2,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  MessagesSquare,
  Radio,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { CountUp, easeOut } from "@/components/motion";

interface Capability {
  icon: LucideIcon;
  title: string;
  text: string;
}

const groups: { key: string; label: string; items: Capability[] }[] = [
  {
    key: "people",
    label: "Workforce",
    items: [
      { icon: MapPin, title: "Geo-verified check-in", text: "Check-in only works inside your office radius." },
      { icon: Clock3, title: "Automatic late marks", text: "Based on your start time, timezone and a grace period." },
      { icon: LayoutDashboard, title: "Who's in today", text: "A live board of present, late, absent and on-leave." },
      { icon: BarChart3, title: "Monthly attendance report", text: "Days present and late per person, ready for payroll." },
      { icon: CalendarDays, title: "Leave with balances", text: "Casual, sick, earned and unpaid, tracked per year." },
      { icon: CalendarCheck, title: "Smart leave rules", text: "Weekends skipped, overlaps blocked, balance checked." },
      { icon: ThumbsUp, title: "Manager approvals", text: "Leads approve their direct reports with one click." },
      { icon: Users, title: "Employee directory", text: "Designations, departments and reporting lines." },
    ],
  },
  {
    key: "teams",
    label: "Teams & delivery",
    items: [
      { icon: UsersRound, title: "Teams with leads", text: "Group people into teams and give each one a lead." },
      { icon: Layers, title: "Service catalogue", text: "Each team lists deliverables, turnaround and pricing." },
      { icon: FolderKanban, title: "Projects & milestones", text: "Break work into milestones clients can sign off." },
      { icon: GanttChart, title: "Drag-and-drop board", text: "To do, in progress, in review and done." },
      { icon: Activity, title: "Auto progress", text: "Percent complete is calculated from real tasks." },
      { icon: UserCog, title: "Lead assigns tasks", text: "Hand work to any team member in one step." },
      { icon: CheckSquare, title: "My tasks", text: "Everything assigned to you across every project." },
      { icon: Radio, title: "Realtime everywhere", text: "Boards, progress and feeds update without refresh." },
    ],
  },
  {
    key: "clients",
    label: "Client experience",
    items: [
      { icon: Briefcase, title: "Private client portal", text: "Each client sees only their own projects." },
      { icon: UsersRound, title: "Browse your teams", text: "Clients explore what every team can do for them." },
      { icon: Inbox, title: "Service requests", text: "Clients ask a team for work, with budget and deadline." },
      { icon: Rocket, title: "One-click projects", text: "Accepted requests become projects with the whole team." },
      { icon: ThumbsUp, title: "Milestone approvals", text: "Approve deliveries or request changes with a note." },
      { icon: MessagesSquare, title: "Shared discussion", text: "One thread per project for the team and client." },
      { icon: Bell, title: "Live status", text: "Clients watch requests and progress move in real time." },
    ],
  },
  {
    key: "admin",
    label: "Governance & security",
    items: [
      { icon: UserPlus, title: "Email invites", text: "Invite straight into a department, manager and projects." },
      { icon: KeyRound, title: "One-time invite links", text: "Hashed, single-use and expiring after 7 days." },
      { icon: Mail, title: "Password reset by email", text: "Secure links that work once and expire in an hour." },
      { icon: ShieldAlert, title: "Brute-force protection", text: "Repeated wrong passwords lock the attempt for 15 min." },
      { icon: Lock, title: "Sign-in security log", text: "Every attempt with device and IP address." },
      { icon: FileSearch, title: "Searchable audit log", text: "Who did what, when, across the whole workspace." },
      { icon: BarChart3, title: "Admin analytics", text: "Attendance trends, workload and delivery health." },
      { icon: ShieldCheck, title: "Role-based access", text: "Admin, manager, employee and client each see their part." },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    items: [
      { icon: Building2, title: "Multi-company", text: "Every company's data is isolated from the others." },
      { icon: Globe2, title: "Platform owner console", text: "See every workspace, its size and activity." },
      { icon: Mail, title: "Email outbox", text: "Every email is kept, even before SMTP is set up." },
    ],
  },
];

const ALL = "all";
const total = groups.reduce((n, g) => n + g.items.length, 0);

/** Every capability, filterable by area, with cards that flip in when the filter changes. */
export function Capabilities() {
  const [active, setActive] = useState(ALL);
  const tabs = [{ key: ALL, label: "Everything" }, ...groups.map((g) => ({ key: g.key, label: g.label }))];
  const items = active === ALL ? groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))) : groups.find((g) => g.key === active)!.items.map((i) => ({ ...i, group: groups.find((g) => g.key === active)!.label }));

  return (
    <div>
      <div className="text-center">
        <p className="text-sm font-semibold text-indigo-300">Out of the box</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
          <span className="text-gradient">
            <CountUp value={total} />
          </span>{" "}
          things WorkNest does for you
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/55">No plugins, no add-ons, no implementation project. Every capability below is live from the first day, for leadership, team leads, employees and clients alike.</p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-1 scroll-thin">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActive(t.key)} className="relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium">
              {active === t.key && <motion.span layoutId="cap-tab" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={clsx("relative", active === t.key ? "text-night" : "text-white/60 hover:text-white")}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 1200 }}>
        <AnimatePresence mode="popLayout">
          {items.map((c, i) => (
            <motion.div
              layout
              key={`${c.group}-${c.title}`}
              initial={{ opacity: 0, rotateX: -35, y: 20 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, rotateX: 35, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.45, delay: Math.min(i, 16) * 0.025, ease: easeOut }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-indigo-400/40 hover:bg-white/[0.06]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-white/55">{c.text}</p>
              {active === ALL && <p className="mt-3 text-[11px] tracking-wider text-white/30 uppercase">{c.group}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
