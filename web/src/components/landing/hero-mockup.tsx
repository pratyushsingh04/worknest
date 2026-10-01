"use client";

import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin, Radio, ThumbsUp } from "lucide-react";

type Col = "progress" | "review" | "done";
interface MockTask {
  id: string;
  title: string;
  who: string;
  color: string;
  priority: string;
}

const tasks: MockTask[] = [
  { id: "a", title: "Payment integration", who: "BE", color: "bg-sky-500", priority: "Urgent" },
  { id: "b", title: "Checkout screen", who: "FE", color: "bg-rose-500", priority: "High" },
  { id: "c", title: "Order history API", who: "BE", color: "bg-emerald-500", priority: "Medium" },
];

// Each step moves one card forward, like a team working through the sprint.
const script: Record<string, Col>[] = [
  { a: "progress", b: "review", c: "progress" },
  { a: "review", b: "review", c: "progress" },
  { a: "review", b: "done", c: "progress" },
  { a: "done", b: "done", c: "review" },
];
const percents = [50, 58, 67, 75];
const toasts = ["Checkout screen moved to review", "Payment integration sent for review", "Team lead approved the checkout screen", "Payment integration completed"];

export function HeroMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % script.length), 2800);
    return () => clearInterval(id);
  }, []);
  const state = script[step];

  // As the product scrolls into view it rotates from a tilted 3D angle to flat.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const rotateX = useTransform(progress, [0, 1], [32, 0]);
  const scale = useTransform(progress, [0, 1], [0.86, 1]);
  const floatZ = useTransform(progress, [0, 1], [140, 60]);

  const column = (col: Col, title: string, dot: string) => (
    <div className="flex-1 rounded-xl bg-white/[0.025] p-2">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-medium text-white/55">
        <span className={`size-1.5 rounded-full ${dot}`} /> {title}
      </p>
      <div className="min-h-32 space-y-2">
        {tasks
          .filter((t) => state[t.id] === col)
          .map((t) => (
            <motion.div
              layout
              layoutId={`mock-${t.id}`}
              key={t.id}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2.5"
            >
              <p className={`text-[11px] font-medium ${col === "done" ? "text-white/40 line-through" : "text-white/90"}`}>{t.title}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/60">{t.priority}</span>
                <span className={`flex size-5 items-center justify-center rounded-full text-[8px] font-semibold text-white ${t.color}`}>{t.who}</span>
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-5xl" style={{ perspective: 1600 }}>
      <motion.div className="preserve-3d relative" style={{ rotateX, scale, transformOrigin: "50% 100%" }}>
        <div className="border-glow overflow-hidden rounded-2xl bg-night-2 shadow-[0_50px_100px_-40px_rgb(0_0_0_/_0.9)]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="mx-auto rounded-md bg-white/[0.04] px-3 py-1 text-[10px] text-white/35">app.worknest.dev/projects/mobile-app</span>
          </div>
          <div className="flex">
            <div className="hidden w-40 shrink-0 space-y-1 border-r border-white/[0.06] p-3 sm:block">
              {["Dashboard", "Projects", "My tasks", "Attendance", "Leave", "Admin console"].map((l, i) => (
                <div key={l} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${i === 1 ? "bg-white/[0.08] text-white" : "text-white/40"}`}>
                  {l}
                </div>
              ))}
            </div>
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Mobile app</p>
                  <p className="text-[11px] text-white/40">Client project · Web Engineering team</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <Radio className="size-3" /> Live
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-indigo-400" animate={{ width: `${percents[step]}%` }} transition={{ duration: 0.8 }} />
                </div>
                <motion.span key={percents[step]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-9 text-right text-xs font-semibold text-white">
                  {percents[step]}%
                </motion.span>
              </div>
              <div className="mt-4 flex gap-2">
                {column("progress", "In progress", "bg-sky-400")}
                {column("review", "In review", "bg-amber-400")}
                {column("done", "Done", "bg-emerald-400")}
              </div>
            </div>
          </div>
        </div>

        {/* Floating layers sit in front of the window in 3D space. */}
        <motion.div style={{ z: floatZ }} className="absolute top-14 -left-8 hidden lg:block">
          <div className="border-glow animate-float rounded-xl bg-night-2 px-3.5 py-2.5 text-xs text-white shadow-2xl">
            <p className="flex items-center gap-1.5 font-medium">
              <MapPin className="size-3.5 text-emerald-300" /> Check-in verified
            </p>
            <p className="mt-0.5 text-white/45">42 m from office · 9:41 AM</p>
          </div>
        </motion.div>
        <motion.div style={{ z: floatZ }} className="absolute top-32 -right-10 hidden lg:block">
          <div className="border-glow animate-float rounded-xl bg-night-2 px-3.5 py-2.5 text-xs text-white shadow-2xl [animation-delay:1.5s]">
            <p className="flex items-center gap-1.5 font-medium">
              <ThumbsUp className="size-3.5 text-sky-300" /> Client approved
            </p>
            <p className="mt-0.5 text-white/45">Milestone · Checkout flow</p>
          </div>
        </motion.div>
        <motion.div style={{ z: floatZ }} className="absolute right-8 -bottom-6 left-1/2 flex -translate-x-1/2 justify-center sm:left-auto sm:translate-x-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="border-glow flex items-center gap-2 rounded-xl bg-night-2 px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-2xl"
            >
              <CheckCircle2 className="size-4 text-emerald-400" /> {toasts[step]}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
