"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { easeOut } from "@/components/motion";

const faqs = [
  {
    q: "Who is WorkNest built for?",
    a: "Service companies of every size: agencies, studios, consultancies and IT firms that manage people, run teams and deliver work for clients. If your business depends on people delivering projects, WorkNest is designed around you.",
  },
  {
    q: "Is each company's data kept separate?",
    a: "Yes. Every workspace is fully isolated. Each request is checked against the signed-in person's company and role, so one organisation can never see another's people, projects or clients.",
  },
  {
    q: "How do team members and clients join?",
    a: "Admins send an email invite that places the person directly into the right role, department, reporting line and projects. The link is single-use, expires after seven days and lets them choose their own password.",
  },
  {
    q: "What exactly do clients see?",
    a: "Only what concerns them. Clients get a private portal with their own projects, live progress, milestones awaiting their approval, a shared discussion with your team, and a catalogue of the teams and services they can request.",
  },
  {
    q: "Can team leads run their own teams?",
    a: "Absolutely. A team lead manages the roster, publishes the team's services and pricing, responds to client requests, converts them into projects and assigns tasks to members, without needing an admin.",
  },
  {
    q: "Does everything update in real time?",
    a: "Yes. Boards, progress, activity feeds, attendance, leave queues and request statuses update instantly for everyone watching, with personal notifications when something needs your attention.",
  },
  {
    q: "What if email isn't configured yet?",
    a: "Nothing is lost. Every invite and password-reset email is kept in the admin outbox, so you can copy the link and share it however you like until your mail server is connected.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-white/10 rounded-[1.75rem] border border-white/10 bg-white/[0.02]">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-8" aria-expanded={isOpen}>
              <span className={`text-base font-medium transition-colors sm:text-lg ${isOpen ? "text-white" : "text-white/75"}`}>{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${isOpen ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200" : "border-white/15 text-white/60"}`}>
                <Plus className="size-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: easeOut }} className="overflow-hidden">
                  <p className="max-w-3xl px-6 pb-6 leading-relaxed text-white/55 sm:px-8">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
