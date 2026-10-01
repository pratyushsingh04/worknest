"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Bell, Check, Eye, FolderKanban, KeyRound, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { clsx } from "clsx";
import { BeamsNetwork } from "@/components/landing/beams";
import { Capabilities } from "@/components/landing/capabilities";
import { Faq } from "@/components/landing/faq";
import { Globe } from "@/components/landing/globe";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { Intro } from "@/components/landing/intro";
import { Magnetic } from "@/components/landing/magnetic";
import { OrbitRing } from "@/components/landing/orbit-ring";
import { Pillars } from "@/components/landing/pillars";
import { SectionIntro } from "@/components/landing/reveal-heading";
import { RotatingWords } from "@/components/landing/rotating-words";
import { ScrollRevealText } from "@/components/landing/scroll-reveal-text";
import { ScrollStory } from "@/components/landing/scroll-story";
import { Logo } from "@/components/logo";
import { CountUp, Reveal, easeOut } from "@/components/motion";
import { Icon3D } from "@/components/three-d";

const container = "mx-auto w-full max-w-[1760px] px-5 sm:px-8 lg:px-14";
const fullBleed = "w-full px-5 sm:px-8 lg:px-10";
const YEAR = new Date().getFullYear();

const marquee = [
  "Workforce intelligence",
  "Location-verified attendance",
  "Policy-aware leave",
  "Accountable teams",
  "Service catalogues",
  "Client requests",
  "Live delivery boards",
  "Milestone sign-off",
  "Private client portals",
  "Real-time everywhere",
  "Email onboarding",
  "Audit & sign-in trails",
  "Role-based access",
  "Multi-company ready",
];

const roles = [
  {
    key: "admin",
    label: "Leadership",
    icon: ShieldCheck,
    title: "Complete command of your organisation.",
    lead: "One live view of your people, teams, delivery and clients, with the controls to shape how the company runs.",
    points: [
      "Onboard clients, form teams and appoint their leads",
      "Invite people straight into the right role, department and projects",
      "A live command centre for attendance, workload and delivery health",
      "Full audit and sign-in trails, with policies you control",
    ],
  },
  {
    key: "lead",
    label: "Team leads",
    icon: FolderKanban,
    title: "Lead teams that deliver, without the overhead.",
    lead: "Everything a lead needs to staff, plan and ship, and to keep clients confident along the way.",
    points: [
      "Own your team's roster and service catalogue",
      "Convert client requests into staffed projects in one click",
      "Delegate tasks on boards that update for everyone",
      "Present milestones to clients for formal sign-off",
    ],
  },
  {
    key: "employee",
    label: "Employees",
    icon: Users,
    title: "Clarity on every working day.",
    lead: "A calm, focused home for the work in front of you, and none of the admin around it.",
    points: [
      "Check in with a single tap, verified by location",
      "Every assignment across every project, in one place",
      "Request leave with your balance always in view",
      "Instant notifications when something needs you",
    ],
  },
  {
    key: "client",
    label: "Clients",
    icon: Eye,
    title: "Confidence, without the follow-up calls.",
    lead: "A private, always-current window into the work, and a direct line to the teams behind it.",
    points: [
      "Explore every team and the services it offers",
      "Raise requests and follow them through to delivery",
      "Approve milestones or request changes with context",
      "One shared conversation with the people doing the work",
    ],
  },
];

function Word({ children, delay, muted }: { children: string; delay: number; muted?: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-2 align-bottom">
      <motion.span className={clsx("inline-block", muted && "text-white/45")} initial={{ y: "110%", rotate: 3 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 0.9, delay, ease: easeOut }}>
        {children}&nbsp;
      </motion.span>
    </span>
  );
}

export default function Landing() {
  const [role, setRole] = useState(roles[0].key);
  const active = roles.find((r) => r.key === role)!;
  // Hero animations wait for the intro so they play in view.
  const [ready, setReady] = useState(false);
  const onIntroDone = useCallback(() => setReady(true), []);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <div className="bg-night text-white">
      <Intro onDone={onIntroDone} />
      <motion.div className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-indigo-400" style={{ scaleX: progress }} />

      {/* Navigation */}
      <motion.header
        // Stays in place (so the intro logo can land on it) and simply fades in.
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-night/65 backdrop-blur-xl"
      >
        <div className={clsx(fullBleed, "flex h-16 items-center justify-between")}>
          <span id="nav-logo">
            <Logo dark />
          </span>
          <nav className="hidden items-center gap-8 text-sm text-white/60 lg:flex">
            {[
              ["#pillars", "Platform"],
              ["#capabilities", "Capabilities"],
              ["#roles", "Solutions"],
              ["#tour", "Tour"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition-colors hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/register" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-night transition-transform hover:scale-[1.03]">
              Get started
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section
        className="relative overflow-hidden pt-28 pb-16 xl:pt-32 xl:pb-20"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        <div className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: "radial-gradient(560px circle at var(--mx, 30%) var(--my, 30%), rgb(99 102 241 / 0.12), transparent 60%)" }} />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-[20%] h-[560px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.3),transparent_65%)]" />
          <div className="absolute inset-0 bg-grid" />
        </div>

        <div key={ready ? "hero-in" : "hero-wait"} className={clsx(container, "relative grid items-center gap-10 xl:grid-cols-[0.9fr_1.1fr]")}>
          <div className="text-center xl:text-left">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
                <Sparkles className="size-3.5 text-indigo-300" />
                The operating system for service companies
              </span>
            </motion.div>

            <h1 className="mt-7 text-5xl leading-[1.04] font-semibold tracking-tight sm:text-6xl xl:text-[4.1rem]">
              <Word delay={0.1}>Your</Word>
              <motion.span className="inline-block pb-2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: easeOut }}>
                <RotatingWords words={["workforce,", "teams,", "delivery,", "clients,"]} className="text-gradient" />
              </motion.span>
              <br />
              {["perfectly", "in", "sync."].map((w, i) => (
                <Word key={w} delay={0.35 + i * 0.08} muted>
                  {w}
                </Word>
              ))}
            </h1>

            <motion.p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/60 xl:mx-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: easeOut }}>
              WorkNest unites workforce management, team operations, project delivery and the client experience in one real-time command centre. Leadership gains complete visibility, teams move with clarity, and clients stay confidently informed.
            </motion.p>

            <motion.div className="mt-9 flex flex-wrap justify-center gap-3 xl:justify-start" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.75, ease: easeOut }}>
              <Magnetic>
                <Link href="/register" className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-night shadow-[0_10px_30px_-10px_rgb(255_255_255_/_0.35)]">
                  Start your workspace
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <a href="#tour" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                  Take the tour
                </a>
              </Magnetic>
            </motion.div>

            <motion.div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-8 text-left max-xl:mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              {[
                { v: 34, l: "capabilities, ready on day one" },
                { v: 5, l: "pillars in one platform" },
                { v: 4, l: "tailored experiences" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-3xl font-semibold tracking-tight">
                    <CountUp value={s.v} />
                  </p>
                  <p className="mt-1 text-xs leading-snug text-white/45">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div className="relative" initial={{ opacity: 0, scale: 0.8, rotateX: 25 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ duration: 1.4, delay: 0.35, ease: easeOut }} style={{ transformPerspective: 1600 }}>
            <OrbitRing
              compact
              heightClass="h-[420px] sm:h-[520px] xl:h-[600px]"
              radiusFactor={0.4}
              maxRadius={330}
              center={<Globe className="w-[300px] cursor-grab active:cursor-grabbing sm:w-[380px] xl:w-[440px]" />}
            />
            <p className="-mt-2 text-center text-xs text-white/30">Drag the globe or the ring · built for teams in any city, any time zone</p>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y border-white/5 bg-white/[0.02] py-6">
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i} className="flex items-center gap-3 text-sm whitespace-nowrap text-white/45">
                <span className="size-1 rounded-full bg-indigo-400/70" /> {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className={clsx(container, "py-28 lg:py-36")}>
        <div className="max-w-5xl">
          <ScrollRevealText
            text="Great companies don't run on spreadsheets and scattered chats. They run on clarity. WorkNest connects every person, team, project and client in one living system, so the whole organisation moves as one."
            highlight={["clarity.", "WorkNest", "one."]}
          />
        </div>
      </section>

      {/* Five pillars */}
      <section id="pillars" className={clsx(container, "pb-28 lg:pb-36")}>
        <SectionIntro
          eyebrow="Five pillars, one platform"
          title="Everything your organisation runs on, unified."
          lead="Each pillar is powerful on its own. Together, they give you a single, real-time view of how your company is performing, and the means to act on it."
        />
        <div className="mt-16">
          <Pillars />
        </div>
      </section>

      {/* Single source of truth */}
      <section className="relative overflow-hidden py-28 lg:py-36">
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.15),transparent_65%)]" />
        <div className={clsx(container, "relative")}>
          <SectionIntro
            eyebrow="A single source of truth"
            title="Every role, connected in real time."
            lead="When a task moves, a leave is approved or a client signs off, the right people know instantly. No refreshes, no status meetings, no guesswork."
          />
          <div className="mt-16">
            <BeamsNetwork />
          </div>
        </div>
      </section>

      {/* Guided tour */}
      <section id="tour" className="relative pt-10">
        <div className={container}>
          <SectionIntro eyebrow="A guided tour" title="See how a working day flows through WorkNest." lead="Scroll to move from the first check-in of the morning to a client signing off on a milestone." />
        </div>
        <ScrollStory />
      </section>

      {/* The product in motion */}
      <section className={clsx(container, "py-28 lg:py-36")}>
        <SectionIntro eyebrow="In motion" title="Work that updates itself, everywhere." lead="Tasks move, progress recalculates and notifications arrive, for every person watching. Nobody refreshes anything." />
        <div className="mx-auto mt-16 max-w-6xl">
          <HeroMockup />
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className={clsx(container, "pb-28 lg:pb-36")}>
        <Capabilities />
      </section>

      {/* Solutions by role */}
      <section id="roles" className="relative border-y border-white/5 bg-white/[0.015] py-28 lg:py-36">
        <div className={clsx(container, "grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start")}>
          <div>
            <SectionIntro align="left" eyebrow="Solutions" title="Built for every seat at the table." lead="Four tailored experiences on one shared foundation. Everyone sees precisely what they need, and nothing they shouldn't." />
            <div className="mt-10 space-y-2">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={clsx("relative flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors", role === r.key ? "text-white" : "text-white/50 hover:text-white/80")}
                >
                  {role === r.key && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.06]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className={clsx("relative flex size-10 items-center justify-center rounded-xl transition-colors", role === r.key ? "bg-indigo-500 text-white" : "bg-white/5")}>
                    <r.icon className="size-5" />
                  </span>
                  <span className="relative">
                    <span className="block font-semibold">{r.label}</span>
                    <span className="block text-sm opacity-70">{r.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ perspective: 1400 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, rotateY: -18, x: 40 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: 18, x: -40 }}
                transition={{ duration: 0.5, ease: easeOut }}
                className="border-glow rounded-[1.75rem] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-10"
              >
                <active.icon className="size-8 text-indigo-300" />
                <h3 className="mt-6 text-3xl font-semibold tracking-tight">{active.title}</h3>
                <p className="mt-3 text-lg text-white/55">{active.lead}</p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {active.points.map((p, i) => (
                    <motion.li key={p} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                        <Check className="size-3 text-indigo-300" />
                      </span>
                      {p}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* By design */}
      <section className={clsx(container, "py-24")}>
        <div className="grid overflow-hidden rounded-[1.75rem] border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: 34, l: "capabilities, live from the first day" },
            { v: 5, l: "pillars working as one platform" },
            { v: 4, l: "tailored experiences, one foundation" },
            { v: 0, l: "page refreshes needed, ever" },
          ].map((m, i) => (
            <Reveal key={m.l} delay={i * 0.08} className="border-white/10 p-8 max-lg:border-b sm:odd:border-r lg:not-last:border-r">
              <p className="text-5xl font-semibold tracking-tight">
                <CountUp value={m.v} />
              </p>
              <p className="mt-2 text-sm text-white/50">{m.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={clsx(container, "pb-28 lg:pb-36")}>
        <SectionIntro eyebrow="Get started" title="From sign-up to fully operational." lead="No implementation project and no consultants. Most companies are up and running the same day." />
        <div className="relative mt-20 grid gap-12 md:grid-cols-3">
          <motion.div
            className="absolute top-8 right-[16%] left-[16%] hidden h-px origin-left bg-gradient-to-r from-indigo-500/0 via-indigo-400 to-indigo-500/0 md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: easeOut }}
          />
          {[
            { icon: KeyRound, title: "Establish your workspace", text: "Create your company, set office locations and working hours, and define the policies your people work by." },
            { icon: UserPlus, title: "Bring your organisation in", text: "Form teams, appoint leads, onboard clients and invite everyone by email, straight into the right place." },
            { icon: Bell, title: "Operate in real time", text: "Check-ins, approvals, requests and delivery all flow live, with every person seeing exactly what matters to them." },
          ].map((s, i) => (
            <Reveal key={s.title} delay={0.2 + i * 0.2} className="relative text-center">
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
        <SectionIntro align="left" eyebrow="FAQ" title="Questions, thoughtfully answered." lead="Everything leaders usually ask before bringing their company onto WorkNest." />
        <Faq />
      </section>

      {/* Closing call to action */}
      <section className={clsx(container, "pb-28")}>
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-20 text-center sm:px-12">
          <div className="absolute inset-0 bg-night-2" />
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute -top-32 left-1/2 h-80 w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.4),transparent_65%)]" />
          <div className="relative">
            <p className="text-sm tracking-[0.3em] text-indigo-300 uppercase">Your company, in sync</p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">Bring your entire company into sync.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">Set up your workspace in minutes and invite your organisation by email. Your people, your teams and your clients will feel the difference on day one.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/register" className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-night">
                  Start your workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                  Sign in
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-14">
        <div className={clsx(container, "grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]")}>
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm text-white/45">The operating system for service companies. Your people, teams, delivery and clients, perfectly in sync.</p>
          </div>
          {[
            { h: "Platform", links: [["#pillars", "Five pillars"], ["#capabilities", "Capabilities"], ["#tour", "Guided tour"]] },
            { h: "Solutions", links: [["#roles", "Leadership"], ["#roles", "Team leads"], ["#roles", "Clients"]] },
            { h: "Account", links: [["/register", "Create a workspace"], ["/login", "Sign in"], ["/forgot-password", "Reset password"]] },
          ].map((col) => (
            <div key={col.h}>
              <p className="text-sm font-semibold text-white">{col.h}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/50">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    <a href={href} className="transition-colors hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={clsx(container, "mt-12 flex flex-col justify-between gap-3 border-t border-white/5 pt-8 text-xs text-white/35 sm:flex-row")}>
          <p>© {YEAR} WorkNest</p>
          <p>Your company, in sync.</p>
        </div>
      </footer>
    </div>
  );
}
