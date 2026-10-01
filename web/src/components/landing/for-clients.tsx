"use client";

import { motion } from "motion/react";
import { Award, Check, Eye, MessagesSquare, Send, ThumbsUp, UsersRound } from "lucide-react";
import { easeOut } from "@/components/motion";

const benefits = [
  { icon: Eye, title: "See progress as it happens", text: "A live percentage and milestone timeline for every project, with no need to ask for an update." },
  { icon: UsersRound, title: "Know exactly who is on it", text: "The team behind the work, its lead and every member, visible from day one." },
  { icon: Award, title: "Judge by track record", text: "How many projects the company and each team have delivered, shown as real numbers from real work." },
  { icon: ThumbsUp, title: "Stay in control", text: "Approve each milestone, or send it back with a note. Nothing is marked done without sign-off." },
  { icon: Send, title: "Ask for more in one step", text: "Browse every team's services and raise a request that becomes a staffed project." },
  { icon: MessagesSquare, title: "One conversation", text: "A shared thread with the people doing the work, instead of scattered emails and calls." },
];

const milestones = [
  { name: "Discovery & design", state: "Approved" },
  { name: "Core build", state: "Approved" },
  { name: "Checkout flow", state: "Awaiting your approval" },
  { name: "Launch", state: "Upcoming" },
];

/** What a client sees in their portal, drawn as a layered 3D preview. */
function PortalPreview() {
  return (
    <div style={{ perspective: 1600 }}>
      <motion.div
        className="preserve-3d relative"
        initial={{ opacity: 0, rotateY: 22, rotateX: 10, y: 40 }}
        whileInView={{ opacity: 1, rotateY: 10, rotateX: 5, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.1, ease: easeOut }}
      >
        <div className="border-glow rounded-2xl bg-night-2 p-6 shadow-[0_50px_100px_-40px_rgb(0_0_0_/_0.9)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Your project</p>
              <p className="text-lg font-semibold text-white">Customer web app</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">On track</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-indigo-400" initial={{ width: 0 }} whileInView={{ width: "68%" }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.3, ease: easeOut }} />
            </div>
            <span className="text-sm font-semibold text-white">68%</span>
          </div>
          <ul className="mt-5 space-y-2">
            {milestones.map((m, i) => (
              <motion.li
                key={m.name}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2.5 text-white/85">
                  <span className={`flex size-4 items-center justify-center rounded-full ${m.state === "Approved" ? "bg-emerald-500" : m.state === "Upcoming" ? "border border-white/25" : "bg-amber-400"}`}>
                    {m.state === "Approved" && <Check className="size-2.5 text-white" />}
                  </span>
                  {m.name}
                </span>
                <span className={`text-xs ${m.state === "Awaiting your approval" ? "font-medium text-amber-300" : "text-white/40"}`}>{m.state}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Who is working on it */}
        <motion.div
          className="border-glow absolute -top-8 -right-6 w-52 rounded-2xl bg-night-2 p-4 shadow-2xl"
          style={{ z: 80 }}
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-xs text-white/40">Working on this</p>
          <p className="mt-1 text-sm font-medium text-white">Web Engineering team</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex -space-x-1.5">
              {["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"].map((c) => (
                <span key={c} className={`size-6 rounded-full ring-2 ring-night-2 ${c}`} />
              ))}
            </span>
            <span className="text-xs text-white/45">lead + 3</span>
          </div>
        </motion.div>

        {/* Track record */}
        <motion.div
          className="border-glow absolute -bottom-10 -left-6 w-56 rounded-2xl bg-night-2 p-4 shadow-2xl"
          style={{ z: 110 }}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="flex items-center gap-1.5 text-xs text-white/40">
            <Award className="size-3.5 text-indigo-300" /> Track record
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {["Delivered", "Active", "Teams"].map((l) => (
              <div key={l} className="rounded-lg bg-white/[0.04] py-2">
                <div className="mx-auto h-4 w-6 rounded bg-indigo-400/30" />
                <p className="mt-1 text-[10px] text-white/45">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/35">Live figures from the company&apos;s own projects</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function ForClients() {
  return (
    <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.05fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: easeOut }}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-indigo-400/40"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20">
              <b.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-white">{b.title}</h3>
            <p className="mt-1 text-sm text-white/55">{b.text}</p>
          </motion.div>
        ))}
      </div>
      <div className="px-6 py-10">
        <PortalPreview />
      </div>
    </div>
  );
}
