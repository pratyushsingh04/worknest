"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, Eye } from "lucide-react";

export type Audience = "company" | "client";

const faces = {
  company: { icon: Building2, label: "For companies", hint: "Run the whole organisation", glow: "rgb(99 102 241 / 0.55)", ring: "border-indigo-400/60", tint: "from-indigo-500 to-indigo-700" },
  client: { icon: Eye, label: "For clients", hint: "Find a company, follow the work", glow: "rgb(52 211 153 / 0.5)", ring: "border-emerald-400/60", tint: "from-emerald-400 to-teal-600" },
} as const;

function Face({ audience, back }: { audience: Audience; back?: boolean }) {
  const f = faces[audience];
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-gradient-to-br ${f.tint} text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.35)] [backface-visibility:hidden]`}
      style={back ? { transform: "rotateY(180deg)" } : undefined}
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
        <f.icon className="size-8" />
      </span>
      <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{f.label}</span>
      <span className="text-sm text-white/75">{f.hint}</span>
    </div>
  );
}

/**
 * Plays while the landing page swaps audience: a card spins one and a half turns
 * in 3D and lands on the new side, with a shockwave behind it.
 */
export function AudienceFlip({ to }: { to: Audience | null }) {
  return (
    <AnimatePresence>
      {to && (
        <motion.div key={to} className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} aria-hidden>
          <motion.div className="absolute inset-0 bg-night" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.92, 0.92, 0] }} transition={{ duration: 1.25, times: [0, 0.2, 0.75, 1] }} />
          <motion.div
            className="absolute size-[70vmax] rounded-full"
            style={{ background: `radial-gradient(circle, ${faces[to].glow}, transparent 60%)` }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.1, 1.4], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.25, times: [0, 0.55, 1], ease: "easeOut" }}
          />
          {[0, 0.18].map((delay) => (
            <motion.span
              key={delay}
              className={`absolute size-64 rounded-full border-2 ${faces[to].ring}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 5], opacity: [0.9, 0] }}
              transition={{ duration: 0.9, delay: 0.55 + delay, ease: "easeOut" }}
            />
          ))}
          <div style={{ perspective: 1400 }}>
            <motion.div
              className="preserve-3d relative h-56 w-80 sm:h-64 sm:w-96"
              // Front is the company side, so a turn and a half lands on "clients" and vice versa.
              initial={{ rotateY: to === "client" ? 0 : 180, rotateX: 18, scale: 0.35, opacity: 0, y: 60 }}
              animate={{ rotateY: to === "client" ? 540 : 720, rotateX: [18, -10, 0, 0], scale: [0.35, 1.08, 1, 1.6], opacity: [0, 1, 1, 0], y: [60, 0, 0, 0] }}
              transition={{ duration: 1.25, times: [0, 0.5, 0.74, 1], ease: [0.3, 0.7, 0.2, 1] }}
            >
              <Face audience="company" />
              <Face audience="client" back />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
