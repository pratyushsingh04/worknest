"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Award, Building2, FolderKanban, LogIn, Search, Send, Sparkles, ThumbsUp, UsersRound } from "lucide-react";
import { clsx } from "clsx";
import { Faq } from "@/components/landing/faq";
import { PortalPreview, clientBenefits } from "@/components/landing/for-clients";
import { Magnetic } from "@/components/landing/magnetic";
import { SectionIntro } from "@/components/landing/reveal-heading";
import { RotatingWords } from "@/components/landing/rotating-words";
import { ScrollRevealText } from "@/components/landing/scroll-reveal-text";
import { ClientJourney } from "@/components/landing/client-journey";
import { Reveal, SpotlightCard, TiltCard, easeOut } from "@/components/motion";
import { Icon3D } from "@/components/three-d";

const container = "mx-auto w-full max-w-[1760px] px-5 sm:px-8 lg:px-14";

const record = [
  { icon: Award, title: "Projects delivered", text: "How many projects each company has completed, counted from its own finished work and never typed in by hand." },
  { icon: FolderKanban, title: "In delivery right now", text: "How much a company is handling at this moment, so you know the capacity you would be relying on." },
  { icon: UsersRound, title: "Teams, departments, people", text: "Every team you can hire, who leads it, who is in it, and the full list of people who work at the company." },
];

const journey = [
  { icon: LogIn, title: "Create a free account", text: "Sign up as a client in a minute. You don't need an invitation, and you belong to no company." },
  { icon: Search, title: "Browse every company", text: "See what each one does, what it is known for, its teams, its people and what it has delivered." },
  { icon: Send, title: "Hand over your project", text: "Ask a team for one of its services, or post what you need and compare the proposals that come back." },
  { icon: ThumbsUp, title: "Follow and approve", text: "Watch progress move as work happens, then approve each milestone or send it back with a note." },
];

const clientFaqs = [
  {
    q: "How do I get access?",
    a: "Create a client account yourself. It is free, needs no invitation and takes about a minute. From there you can open any company listed on WorkNest.",
  },
  {
    q: "Which companies can I see?",
    a: "Every company that has completed its public profile. When a new company registers and fills in what it does, it appears in the directory with its teams, services and people.",
  },
  {
    q: "What can I see about a company?",
    a: "What it does and specialises in, where it is, its teams and their leads, the services and prices each team offers, everyone who works there by department, and its delivery record.",
  },
  {
    q: "What happens once I give a company a project?",
    a: "It appears in your portal with live progress, its milestones, the team and department working on it, every update, and a shared conversation with the people doing the work.",
  },
  {
    q: "Can I see other clients' work?",
    a: "No. Your portal shows only your projects. The track record is shown as totals, so you can judge the company without seeing anyone else's details, and nobody sees yours.",
  },
  {
    q: "Are the progress numbers real?",
    a: "Yes. Progress is calculated from the tasks the team actually completes, and the delivery record is counted from finished projects. Nobody can edit these figures by hand.",
  },
  {
    q: "What if I don't know which company to pick?",
    a: "Post what you need. Every listed company sees it with your contact details and can reply with a proposal naming the team that would do the work. You choose the one you like.",
  },
];

const strip = [
  "Company directory",
  "Real teams and people",
  "Live project progress",
  "Named team and lead",
  "Milestone sign-off",
  "Delivery track record",
  "Service catalogue",
  "One-step requests",
  "Shared discussion",
  "Private by design",
  "Real-time updates",
  "Proposals from companies",
  "Nothing to install",
];

function Rise({ children, delay, className }: { children: string; delay: number; className?: string }) {
  return (
    <span className="inline-block overflow-hidden pb-2 align-bottom">
      <motion.span className={clsx("inline-block", className)} initial={{ y: "110%", rotate: 3 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 0.9, delay, ease: easeOut }}>
        {children}&nbsp;
      </motion.span>
    </span>
  );
}

/** A small moving picture for each track-record card. No figures, only shape. */
function RecordVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 120 120" className="size-28">
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
        <motion.circle cx="60" cy="60" r="46" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 60 60)" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, delay: 0.3, ease: easeOut }} />
        <motion.path d="M42 61 l12 12 l24 -26" fill="none" stroke="#34d399" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1.7 }} />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <div className="flex h-28 items-end gap-2.5">
        {[0.45, 0.8, 0.6, 1, 0.7].map((h, i) => (
          <motion.span key={i} className="h-full w-4 origin-bottom rounded-t-md bg-gradient-to-t from-indigo-500/40 to-indigo-300" animate={{ scaleY: [h * 0.6, h, h * 0.75, h * 0.6] }} transition={{ duration: 3.2, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </div>
    );
  }
  return (
    <div className="relative size-28">
      <motion.span className="absolute inset-0 rounded-full border border-dashed border-indigo-300/30" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
      {["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-sky-400"].map((c, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.span
            key={c}
            className={clsx("absolute size-7 rounded-full ring-2 ring-night-2", c)}
            style={{ left: `calc(50% + ${Math.round(Math.cos(a) * 42)}px - 14px)`, top: `calc(50% + ${Math.round(Math.sin(a) * 42)}px - 14px)` }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 + i * 0.12 }}
          />
        );
      })}
      <motion.span className="absolute top-1/2 left-1/2 -mt-[18px] -ml-[18px] size-9 rounded-full bg-white/90" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
    </div>
  );
}

/** The landing page as a client of a company on WorkNest should see it. */
export function ClientLanding({ onShowCompany }: { onShowCompany: () => void }) {
  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-28 pb-20 xl:pt-36 xl:pb-28"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        <div className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: "radial-gradient(560px circle at var(--mx, 70%) var(--my, 30%), rgb(52 211 153 / 0.1), transparent 60%)" }} />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-[10%] h-[560px] w-[900px] bg-[radial-gradient(ellipse_at_center,rgb(16_185_129_/_0.16),transparent_65%)]" />
          <div className="absolute -top-40 left-[15%] h-[560px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.28),transparent_65%)]" />
          <div className="absolute inset-0 bg-grid" />
        </div>

        <div className={clsx(container, "relative grid items-center gap-16 xl:grid-cols-[1fr_1fr]")}>
          <div className="text-center xl:text-left">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <Sparkles className="size-3.5 text-emerald-300" />
              For anyone looking to hire a company
            </motion.span>

            <h1 className="mt-7 text-5xl leading-[1.04] font-semibold tracking-tight sm:text-6xl xl:text-[4.1rem]">
              {["Hire", "with", "proof.", "Know", "your"].map((w, i) => (
                <Rise key={w} delay={0.45 + i * 0.08}>
                  {w}
                </Rise>
              ))}
              <br />
              <motion.span className="inline-block pb-2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease: easeOut }}>
                <RotatingWords words={["progress.", "team.", "milestones.", "next step."]} className="text-gradient" />
              </motion.span>
              <br />
              {["Without", "asking."].map((w, i) => (
                <Rise key={w} delay={0.85 + i * 0.08} className="text-white/45">
                  {w}
                </Rise>
              ))}
            </h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.05, ease: easeOut }} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/60 xl:mx-0">
Browse every company registered on WorkNest: what it does, what it is known for, who works there and what it has delivered. Give one your project, then watch its progress, its team and every update, live.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.2, ease: easeOut }} className="mt-9 flex flex-wrap justify-center gap-3 xl:justify-start">
              <Magnetic>
                <Link href="/register/client" className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-night shadow-[0_10px_30px_-10px_rgb(255_255_255_/_0.35)]">
                  Join as a client
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                  Sign in
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          <motion.div className="mx-auto w-full max-w-xl px-6 py-10" initial={{ opacity: 0, scale: 0.85, rotateX: 22 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ duration: 1.3, delay: 0.55, ease: easeOut }} style={{ transformPerspective: 1600 }}>
            <TiltCard max={7} glare={false} className="relative">
              <PortalPreview />
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* What the portal covers */}
      <section className="border-y border-white/5 bg-white/[0.02] py-6">
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...strip, ...strip].map((m, i) => (
              <span key={i} className="flex items-center gap-3 text-sm whitespace-nowrap text-white/45">
                <span className="size-1 rounded-full bg-emerald-400/70" /> {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className={clsx(container, "py-24 lg:py-32")}>
        <div className="max-w-5xl">
          <ScrollRevealText
            text="Choosing a company shouldn't be a leap of faith, and working with one shouldn't mean chasing updates. Here every company shows its real teams and its real record, the progress is live, and nothing is finished until you say so."
            highlight={["real", "live,", "you", "say", "so."]}
          />
        </div>
      </section>

      {/* A project, start to sign-off */}
      <section id="journey" className="relative">
        <div className={container}>
          <SectionIntro eyebrow="Watch it happen" title="Follow one project, from first task to final sign-off." lead="Scroll to see what your portal shows as the work moves forward." />
        </div>
        <ClientJourney />
      </section>

      {/* What you get */}
      <section id="portal" className={clsx(container, "py-28 lg:py-36")}>
        <SectionIntro eyebrow="Your portal" title="Everything you need to trust the work." lead="Six things every client gets from the first day a company starts their project." />
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientBenefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 40, rotateX: 18 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: (i % 3) * 0.1, ease: easeOut }}
              style={{ transformPerspective: 1200 }}
            >
              <TiltCard max={6} className="relative h-full rounded-2xl">
                <SpotlightCard className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-indigo-400/40">
                  <span className="absolute top-6 right-7 text-5xl font-semibold text-white/[0.05]">{String(i + 1).padStart(2, "0")}</span>
                  <motion.span className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.5, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}>
                    <b.icon className="size-5" />
                  </motion.span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{b.title}</h3>
                  <p className="mt-2 text-white/55">{b.text}</p>
                </SpotlightCard>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Track record */}
      <section id="record" className="relative border-y border-white/5 bg-white/[0.015] py-28 lg:py-36">
        <div className={container}>
          <SectionIntro eyebrow="Track record" title="Judge every company on evidence, not promises." lead="Each company's page shows its delivery record as live figures, drawn from the work it has actually done on WorkNest." />
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {record.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.1} className="border-glow rounded-[1.75rem] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8">
                <div className="flex items-start justify-between">
                  <r.icon className="size-8 text-indigo-300" />
                  <RecordVisual index={i} />
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{r.title}</h3>
                <p className="mt-3 text-white/55">{r.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How you get access */}
      <section id="access" className={clsx(container, "py-28 lg:py-36")}>
        <SectionIntro eyebrow="How it works" title="From sign-up to sign-off." lead="No invitation and nothing to install. Create an account and the whole directory is open to you." />
        <div className="relative mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            className="absolute top-8 right-[12%] left-[12%] hidden h-px origin-left bg-gradient-to-r from-indigo-500/0 via-indigo-400 to-indigo-500/0 lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: easeOut }}
          />
          {journey.map((s, i) => (
            <Reveal key={s.title} delay={0.15 + i * 0.15} className="relative text-center">
              <div className="flex justify-center">
                <Icon3D icon={s.icon} size={64} />
              </div>
              <p className="mt-6 text-xs font-medium tracking-[0.2em] text-white/35 uppercase">Step {i + 1}</p>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-sm text-white/55">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={clsx(container, "grid gap-12 pb-28 lg:grid-cols-[0.8fr_1.2fr] lg:pb-36")}>
        <SectionIntro align="left" eyebrow="FAQ" title="What clients usually ask." lead="Straight answers about access, privacy and what the numbers mean." />
        <Faq items={clientFaqs} />
      </section>

      {/* Closing call to action */}
      <section className={clsx(container, "pb-28")}>
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-20 text-center sm:px-12">
          <div className="absolute inset-0 bg-night-2" />
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute -top-32 left-1/2 h-80 w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.4),transparent_65%)]" />
          <div className="relative">
            <p className="text-sm tracking-[0.3em] text-indigo-300 uppercase">Your project, in view</p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">Find the company. Follow the work.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">Create a free client account and open the directory. If you run a company yourself, register it and clients will find you here.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/register/client" className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-night">
                  Join as a client <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <button onClick={onShowCompany} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                  <Building2 className="size-4" /> See WorkNest for companies
                </button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
