"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Check, FolderKanban, MapPin, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { SpotlightCard, TiltCard, easeOut } from "@/components/motion";
import { GeoMap } from "./geo-map";

function useTicker(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return i;
}

// ---- Mini visuals --------------------------------------------------------------

function WorkforceVisual() {
  const days = [68, 84, 96, 78, 92];
  return (
    <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr] sm:items-stretch">
      <GeoMap />
      <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-white/45">Attendance this week</p>
        <div className="mt-2 flex h-24 items-end gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                className="w-full max-w-7 rounded-t-[4px] bg-indigo-400"
                initial={{ height: 0 }}
                whileInView={{ height: `${d}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: easeOut }}
              />
              <span className="text-[10px] text-white/40">{["Mon", "Tue", "Wed", "Thu", "Fri"][i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-white/60">
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-1">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Verified
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-1">
            <span className="size-1.5 rounded-full bg-amber-400" /> Outside radius
          </span>
        </div>
      </div>
    </div>
  );
}

const teamCards = [
  { name: "Engineering", tint: "from-indigo-500 to-indigo-700", chips: ["Web platforms", "APIs"] },
  { name: "Design", tint: "from-rose-500 to-rose-700", chips: ["Product design", "Brand"] },
  { name: "Mobile", tint: "from-emerald-500 to-emerald-700", chips: ["iOS & Android"] },
];

function TeamsVisual() {
  const front = useTicker(teamCards.length, 2600);
  const order = teamCards.map((_, i) => teamCards[(front + i) % teamCards.length]);
  return (
    <div className="relative h-40" style={{ perspective: 900 }}>
      {order.map((t, depth) => (
        <motion.div
          key={t.name}
          animate={{ y: depth * -16, scale: 1 - depth * 0.07, opacity: 1 - depth * 0.3, rotateX: depth * 6 }}
          transition={{ duration: 0.6, ease: easeOut }}
          style={{ zIndex: 10 - depth }}
          className={clsx("absolute inset-x-4 bottom-0 rounded-2xl bg-gradient-to-br p-4 text-white shadow-2xl", t.tint)}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t.name} team</p>
            <span className="flex -space-x-1.5">
              {["bg-white/90", "bg-white/60", "bg-white/40"].map((c) => (
                <span key={c} className={clsx("size-5 rounded-full ring-2 ring-black/10", c)} />
              ))}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/75">Lead · members · service catalogue</p>
          <div className="mt-3 flex gap-1.5">
            {t.chips.map((c) => (
              <span key={c} className="rounded-md bg-white/15 px-2 py-0.5 text-[11px]">
                {c}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DeliveryVisual() {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#818cf8"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c * 0.28 }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: easeOut }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-white">72%</span>
          <span className="text-[10px] text-white/40">complete</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {[
          ["Discovery & design", true],
          ["Core platform", true],
          ["Payments & checkout", false],
          ["Launch", false],
        ].map(([label, done], i) => (
          <motion.div
            key={label as string}
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/80"
          >
            <span className={clsx("flex size-4 items-center justify-center rounded-full", done ? "bg-emerald-500" : "border border-white/25")}>{done && <Check className="size-2.5 text-white" />}</span>
            {label as string}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const requestSteps = ["Request raised", "Under review", "Accepted", "Project live"];

function ClientVisual() {
  const step = useTicker(requestSteps.length + 1, 1300);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs text-white/45">Your request to the Design team</p>
        <p className="mt-1 text-sm font-medium text-white">Brand identity refresh</p>
        <div className="mt-4 flex items-center">
          {requestSteps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <motion.span
                animate={{ backgroundColor: i < step ? "#6366f1" : "rgba(255,255,255,0.08)", scale: i === step - 1 ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.4 }}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </motion.span>
              {i < requestSteps.length - 1 && (
                <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full bg-indigo-400" animate={{ width: i < step - 1 ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 text-xs font-medium text-indigo-200">
            {step === 0 ? "Drafting…" : requestSteps[step - 1]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3">
        <p className="text-xs text-white/80">Milestone ready for your approval</p>
        <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white">Approve</span>
      </div>
    </div>
  );
}

const auditLines = [
  "Invite sent · Engineering · expires in 7 days",
  "Sign-in verified · Chrome on Windows",
  "Role updated · Manager access granted",
  "Milestone approved · client portal",
  "Leave approved · policy balance checked",
  "Failed sign-in blocked · rate limit applied",
  "Team lead assigned · Design team",
  "Password reset · single-use link redeemed",
];

function GovernanceVisual() {
  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-black/30 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
      <motion.div className="space-y-2 p-4 font-mono text-[11px]" animate={{ y: ["0%", "-50%"] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
        {[...auditLines, ...auditLines].map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-white/60">
            <span className="text-emerald-400">●</span>
            <span className="text-white/30">{String(9 + (i % 9)).padStart(2, "0")}:{String((i * 7) % 60).padStart(2, "0")}</span>
            {l}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ---- Pillar cards ----------------------------------------------------------------

interface Pillar {
  icon: LucideIcon;
  index: string;
  name: string;
  headline: string;
  text: string;
  points: string[];
  visual: () => React.JSX.Element;
  span: string;
}

const pillars: Pillar[] = [
  {
    icon: MapPin,
    index: "01",
    name: "Workforce Intelligence",
    headline: "Know who's working, where and when, without chasing anyone.",
    text: "Location-verified attendance, policy-aware leave and a living organisation chart turn people operations into a quiet, self-running system.",
    points: ["Geo-verified attendance", "Policy-aware leave balances", "Departments & reporting lines", "Monthly attendance insight"],
    visual: WorkforceVisual,
    span: "lg:col-span-7",
  },
  {
    icon: UsersRound,
    index: "02",
    name: "Team Operations",
    headline: "Accountable teams, with ownership that's never in question.",
    text: "Every team has a lead, a clear roster and a published catalogue of what it delivers. Work is delegated in a single step.",
    points: ["Team leads & rosters", "Service catalogues with pricing", "One-step delegation"],
    visual: TeamsVisual,
    span: "lg:col-span-5",
  },
  {
    icon: FolderKanban,
    index: "03",
    name: "Delivery Excellence",
    headline: "Turn commitments into outcomes everyone can see.",
    text: "Milestones, live boards and self-calculating progress make every deliverable visible, measurable and on track.",
    points: ["Milestones & live boards", "Self-calculating progress", "Real-time activity"],
    visual: DeliveryVisual,
    span: "lg:col-span-5",
  },
  {
    icon: Briefcase,
    index: "04",
    name: "Client Experience",
    headline: "A premium window into the work, for every client.",
    text: "Clients explore your capabilities, raise requests, approve milestones and follow progress in their own private portal. Status calls become a thing of the past.",
    points: ["Private client portal", "Service requests to projects", "Milestone sign-off"],
    visual: ClientVisual,
    span: "lg:col-span-7",
  },
  {
    icon: ShieldCheck,
    index: "05",
    name: "Governance & Security",
    headline: "Operate with confidence, compliant by default.",
    text: "Granular roles, hashed single-use invites, brute-force protection and a complete audit trail keep your organisation secure without slowing anyone down.",
    points: ["Role-based access control", "Single-use, expiring invites", "Brute-force protection", "Complete audit & sign-in trail"],
    visual: GovernanceVisual,
    span: "lg:col-span-12",
  },
];

function PillarCard({ p, i }: { p: Pillar; i: number }) {
  const wide = p.span === "lg:col-span-12";
  return (
    <motion.div
      className={p.span}
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay: (i % 2) * 0.1, ease: easeOut }}
      style={{ transformPerspective: 1400 }}
    >
      <TiltCard className="h-full rounded-[1.75rem]" max={3} glare={false}>
        <SpotlightCard className="h-full rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-7 sm:p-8">
          <div className={clsx("grid h-full gap-8", wide && "lg:grid-cols-[1fr_1.1fr] lg:items-center")}>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                  <p.icon className="size-5" />
                </span>
                <span className="text-xs font-medium tracking-[0.2em] text-white/35 uppercase">
                  {p.index} · {p.name}
                </span>
              </div>
              <h3 className="mt-5 text-2xl leading-snug font-semibold tracking-tight text-white">{p.headline}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/55">{p.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                    <Check className="size-3 text-indigo-300" /> {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className={clsx(!wide && "mt-auto")}>
              <p.visual />
            </div>
          </div>
        </SpotlightCard>
      </TiltCard>
    </motion.div>
  );
}

export function Pillars() {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {pillars.map((p, i) => (
        <PillarCard key={p.name} p={p} i={i} />
      ))}
    </div>
  );
}
