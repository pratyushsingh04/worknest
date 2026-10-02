"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, CheckCircle2, MapPin, ThumbsUp } from "lucide-react";
import { Logo } from "./logo";
import { easeOut } from "./motion";
import { WAKING_EVENT, warmUp } from "@/lib/api";

const feed = [
  { icon: MapPin, color: "text-emerald-300", title: "Check-in verified", sub: "Inside the office radius · on time" },
  { icon: CheckCircle2, color: "text-indigo-300", title: "Task moved to Done", sub: "Project progress updated for everyone" },
  { icon: ThumbsUp, color: "text-sky-300", title: "Client approved a milestone", sub: "Straight from their portal" },
  { icon: CalendarCheck, color: "text-amber-300", title: "Leave request approved", sub: "Balance updated automatically" },
];

const week = [
  { day: "Mon", value: 92 },
  { day: "Tue", value: 88 },
  { day: "Wed", value: 96 },
  { day: "Thu", value: 84 },
  { day: "Fri", value: 90 },
];

function LiveFeed() {
  const [start, setStart] = useState(0);
  useEffect(warmUp, []);
  useEffect(() => {
    const id = setInterval(() => setStart((s) => (s + 1) % feed.length), 2600);
    return () => clearInterval(id);
  }, []);
  const visible = [0, 1, 2].map((i) => ({ ...feed[(start + i) % feed.length], key: (start + i) % feed.length }));

  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((item, i) => (
          <motion.div
            key={item.key}
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1 - i * 0.28, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
              <item.icon className={`size-4 ${item.color}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="truncate text-xs text-white/45">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** A tilted, layered preview of the product: attendance card in front, live feed behind. */
function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" style={{ perspective: 1400 }}>
      <motion.div
        className="preserve-3d relative"
        initial={{ opacity: 0, rotateX: 30, rotateY: -30, y: 40 }}
        animate={{ opacity: 1, rotateX: 12, rotateY: -16, y: 0 }}
        transition={{ duration: 1.1, ease: easeOut, delay: 0.2 }}
      >
        <div className="border-glow rounded-2xl bg-night-2 p-4 shadow-[0_40px_80px_-30px_rgb(0_0_0_/_0.9)]">
          <p className="mb-3 text-xs font-medium tracking-wider text-white/40 uppercase">Activity · live</p>
          <LiveFeed />
        </div>

        <motion.div
          className="border-glow absolute -right-8 -bottom-16 w-56 rounded-2xl bg-night-2 p-4 shadow-[0_30px_60px_-20px_rgb(0_0_0_/_0.9)]"
          style={{ z: 90 }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-xs text-white/45">Attendance this week</p>
          <p className="mt-1 text-sm font-medium text-white">Live, per day</p>
          <div className="mt-3 flex h-14 items-end gap-1.5">
            {week.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="w-full max-w-5 rounded-t-[4px] bg-indigo-400"
                  initial={{ height: 0 }}
                  animate={{ height: `${d.value * 0.44}px` }}
                  transition={{ duration: 0.8, delay: 0.9 + i * 0.08, ease: easeOut }}
                />
                <span className="text-[9px] text-white/40">{d.day}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Explains the wait while a sleeping server wakes up. */
function WakingNotice() {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setWaking((e as CustomEvent<boolean>).detail);
    window.addEventListener(WAKING_EVENT, on);
    return () => window.removeEventListener(WAKING_EVENT, on);
  }, []);
  return (
    <AnimatePresence>
      {waking && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <p className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
            Waking the server. This can take up to a minute, and you don&apos;t need to press anything again.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Split-screen frame shared by sign in, sign up, invites and password pages. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col px-4 py-8 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-light" />
        <Link href="/" className="relative">
          <Logo />
        </Link>
        <motion.div
          className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-2 text-sm text-muted">{subtitle}</div>}
          <div className="mt-8">
            <WakingNotice />
            {children}
          </div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute -top-40 left-1/2 h-96 w-[80%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.28),transparent_70%)]" />
        </div>
        <div className="relative">
          <p className="text-sm font-medium text-indigo-300">The operating system for service companies</p>
          <h2 className="mt-3 max-w-md text-4xl leading-tight font-semibold tracking-tight text-white">Your company, perfectly in sync.</h2>
        </div>
        <div className="relative py-10">
          <ProductPreview />
        </div>
        <p className="relative text-xs text-white/40">Workforce · Teams · Delivery · Client experience · Governance</p>
      </div>
    </div>
  );
}
