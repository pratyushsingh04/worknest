"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Check, CheckCircle2, Clock3, FolderKanban, Send, UsersRound, Eye } from "lucide-react";
import { clsx } from "clsx";
import { easeOut } from "@/components/motion";
import { GeoMap } from "./geo-map";

const chapters = [
  {
    icon: Clock3,
    title: "The morning, accounted for",
    text: "Your people check in with a single tap. WorkNest verifies their location against the office, applies your punctuality policy and gives leadership a live view of who's in.",
  },
  {
    icon: FolderKanban,
    title: "Delivery that reports itself",
    text: "Milestones and tasks move across a live board. Every change recalculates progress on every screen, including your client's, so status is never a question.",
  },
  {
    icon: UsersRound,
    title: "Teams that own their craft",
    text: "Each team has a lead, a roster and a published catalogue of what it delivers, with deliverables, turnaround and pricing. Leads delegate work in a single step.",
  },
  {
    icon: Eye,
    title: "Clients who feel looked after",
    text: "Clients explore your teams, raise requests, approve milestones and follow progress in their own private portal. Confidence replaces follow-up calls.",
  },
];

function AttendancePanel() {
  return (
    <div className="grid h-full grid-cols-[1.6fr_1fr] gap-3 p-5">
      <GeoMap className="self-center" />
      <div className="flex flex-col justify-center gap-2">
        {[
          ["Verified on arrival", "bg-emerald-400"],
          ["Late after 10:15", "bg-amber-400"],
          ["On approved leave", "bg-sky-400"],
          ["Outside the radius", "bg-rose-400"],
        ].map(([label, dot], i) => (
          <motion.div key={label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm text-white/80">
            <span className={clsx("size-2 shrink-0 rounded-full", dot)} /> {label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProjectsPanel() {
  const cols = [
    { name: "To do", dot: "bg-gray-400", items: ["Order history API", "Push notifications"] },
    { name: "In progress", dot: "bg-sky-400", items: ["Payment integration"] },
    { name: "Done", dot: "bg-emerald-400", items: ["Login with OTP", "Product listing"] },
  ];
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Mobile app</p>
        <span className="text-xs text-white/45">Milestone 2 of 4</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-indigo-400" initial={{ width: "20%" }} animate={{ width: "60%" }} transition={{ duration: 1.2, ease: easeOut }} />
        </div>
        <span className="text-xs font-semibold text-white">60%</span>
      </div>
      <div className="mt-5 grid flex-1 grid-cols-3 gap-3">
        {cols.map((c, ci) => (
          <div key={c.name} className="rounded-xl bg-white/[0.03] p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-white/55">
              <span className={clsx("size-1.5 rounded-full", c.dot)} /> {c.name}
            </p>
            <div className="space-y-2">
              {c.items.map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 10, rotateX: -30 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.15 + ci * 0.1 + i * 0.08, ease: easeOut }}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2.5 text-xs text-white/85"
                >
                  <span className={c.name === "Done" ? "text-white/45 line-through" : ""}>{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamsPanel() {
  const teams = [
    { name: "Web Engineering", color: "from-indigo-500 to-indigo-700", services: ["Web apps", "APIs & integrations"] },
    { name: "Design Studio", color: "from-rose-500 to-rose-700", services: ["UI/UX design", "Brand identity"] },
    { name: "Mobile", color: "from-emerald-500 to-emerald-700", services: ["iOS & Android apps"] },
  ];
  return (
    <div className="grid h-full grid-cols-3 items-center gap-3 p-6" style={{ perspective: 900 }}>
      {teams.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, rotateY: -60, z: -80 }}
          animate={{ opacity: 1, rotateY: 0, z: 0 }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.7, ease: easeOut }}
          className={clsx("flex h-56 flex-col rounded-2xl bg-gradient-to-br p-4 text-white shadow-2xl", t.color)}
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold">{t.name[0]}</span>
          <p className="mt-3 text-sm font-semibold">{t.name}</p>
          <p className="text-[11px] text-white/70">Lead + team</p>
          <div className="mt-auto space-y-1.5">
            {t.services.map((s) => (
              <p key={s} className="rounded-md bg-white/15 px-2 py-1 text-[11px]">
                {s}
              </p>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PortalPanel() {
  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <div className="rounded-2xl bg-white/[0.04] p-4">
        <p className="text-xs text-white/45">Your project</p>
        <p className="mt-1 text-sm font-semibold text-white">Customer web app</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-emerald-400" initial={{ width: "40%" }} animate={{ width: "75%" }} transition={{ duration: 1.2, ease: easeOut }} />
          </div>
          <span className="text-xs font-semibold text-white">75%</span>
        </div>
      </div>
      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
        <p className="text-sm font-medium text-white">Milestone ready for your approval</p>
        <p className="text-xs text-white/50">Checkout flow · delivered by Web Engineering</p>
        <div className="mt-3 flex gap-2">
          <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white">
            <Check className="size-3.5" /> Approve
          </motion.span>
          <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/80">Request changes</span>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-4">
        <Send className="size-4 text-indigo-300" />
        <div>
          <p className="text-sm text-white">Request sent to Design Studio</p>
          <p className="text-xs text-white/45">Brand identity · accepted, project starting</p>
        </div>
        <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
      </div>
    </div>
  );
}

const panels = [AttendancePanel, ProjectsPanel, TeamsPanel, PortalPanel];

/** The product in a 3D frame; the screen flips between modules as you scroll. */
function Device({ index, rotateY }: { index: number; rotateY?: MotionValue<number> }) {
  const Panel = panels[index];
  return (
    <div style={{ perspective: 1600 }} className="w-full">
      <motion.div style={{ rotateY, rotateX: 8 }} className="preserve-3d">
        <div className="border-glow overflow-hidden rounded-2xl bg-night-2 shadow-[0_60px_120px_-40px_rgb(0_0_0_/_0.95)]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="mx-auto text-[10px] text-white/35">{["attendance", "projects", "teams", "client portal"][index]}</span>
          </div>
          <div className="relative h-[360px]" style={{ perspective: 1200 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0, rotateX: -25, y: 30 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, rotateX: 25, y: -30 }}
                transition={{ duration: 0.45, ease: easeOut }}
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(chapters.length - 1, Math.floor(v * chapters.length))));
  const rotateY = useSpring(useTransform(scrollYProgress, [0, 1], [-14, 14]), { stiffness: 80, damping: 20 });
  const bar = useSpring(scrollYProgress, { stiffness: 100, damping: 24 });

  return (
    <>
      {/* Desktop: pinned, scroll-driven story. */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${chapters.length * 90}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-[1760px] grid-cols-[0.8fr_1.2fr] items-center gap-16 px-14">
            <div className="relative pl-6">
              <div className="absolute top-0 bottom-0 left-0 w-px bg-white/10">
                <motion.div className="w-px origin-top bg-indigo-400" style={{ scaleY: bar, height: "100%" }} />
              </div>
              {chapters.map((c, i) => (
                <motion.div key={c.title} animate={{ opacity: i === active ? 1 : 0.3, x: i === active ? 0 : -6 }} transition={{ duration: 0.4 }} className="py-5">
                  <div className="flex items-center gap-3">
                    <span className={clsx("flex size-9 items-center justify-center rounded-xl transition-colors", i === active ? "bg-indigo-500 text-white" : "bg-white/5 text-white/50")}>
                      <c.icon className="size-4" />
                    </span>
                    <h3 className="text-xl font-semibold text-white">{c.title}</h3>
                  </div>
                  <AnimatePresence initial={false}>
                    {i === active && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden pl-12 text-white/60">
                        {c.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            <Device index={active} rotateY={rotateY} />
          </div>
        </div>
      </div>

      {/* Mobile and tablet: the same story, stacked. */}
      <div className="mx-auto max-w-2xl space-y-16 px-4 lg:hidden">
        {chapters.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: easeOut }}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <c.icon className="size-4" />
              </span>
              <h3 className="text-xl font-semibold text-white">{c.title}</h3>
            </div>
            <p className="mb-6 text-white/60">{c.text}</p>
            <Device index={i} />
          </motion.div>
        ))}
      </div>
    </>
  );
}
