"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Award, Building2, FolderKanban, LogIn, Mail, Send, Sparkles, ThumbsUp, UsersRound } from "lucide-react";
import { clsx } from "clsx";
import { Faq } from "@/components/landing/faq";
import { PortalPreview, clientBenefits } from "@/components/landing/for-clients";
import { Magnetic } from "@/components/landing/magnetic";
import { SectionIntro } from "@/components/landing/reveal-heading";
import { RotatingWords } from "@/components/landing/rotating-words";
import { ScrollRevealText } from "@/components/landing/scroll-reveal-text";
import { Reveal, easeOut } from "@/components/motion";
import { Icon3D } from "@/components/three-d";

const container = "mx-auto w-full max-w-[1760px] px-5 sm:px-8 lg:px-14";

const record = [
  { icon: Award, title: "Projects delivered", text: "How many projects the company has completed, counted from its own finished work and never typed in by hand." },
  { icon: FolderKanban, title: "In delivery right now", text: "How much the company is handling at this moment, so you know the capacity you are relying on." },
  { icon: UsersRound, title: "Teams and their leads", text: "Every team you can work with, who leads it, who is in it and the services it offers." },
];

const journey = [
  { icon: Mail, title: "You receive an invitation", text: "The company you work with invites you by email. The link is private, single-use and yours alone." },
  { icon: LogIn, title: "Open your portal", text: "Choose your own password and sign in. Only your projects are there, nothing from anyone else." },
  { icon: ThumbsUp, title: "Follow and approve", text: "Watch progress move as work happens, then approve each milestone or send it back with a note." },
  { icon: Send, title: "Ask for more", text: "Browse the company's teams and services and raise a new request whenever you need one." },
];

const clientFaqs = [
  {
    q: "How do I get access?",
    a: "The company delivering your project invites you by email. Open the link, choose a password and you are in. There is nothing to install and no workspace for you to set up.",
  },
  {
    q: "What exactly can I see?",
    a: "Your own projects with live progress, the milestones waiting for your approval, the team working for you, the company's delivery record, the services each team offers and a shared discussion with the people doing the work.",
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
    q: "How do I ask for new work?",
    a: "Open Teams in your portal, pick a team, read what it offers and send a request. The team lead reviews it and, once accepted, it becomes a staffed project you can follow like any other.",
  },
];

/** The landing page as a client of a company on WorkNest should see it. */
export function ClientLanding({ onShowCompany }: { onShowCompany: () => void }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20 xl:pt-36 xl:pb-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-[10%] h-[560px] w-[900px] bg-[radial-gradient(ellipse_at_center,rgb(16_185_129_/_0.16),transparent_65%)]" />
          <div className="absolute -top-40 left-[15%] h-[560px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.28),transparent_65%)]" />
          <div className="absolute inset-0 bg-grid" />
        </div>

        <div className={clsx(container, "relative grid items-center gap-16 xl:grid-cols-[1fr_1fr]")}>
          <div className="text-center xl:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
              <Sparkles className="size-3.5 text-emerald-300" />
              For clients of companies on WorkNest
            </span>

            <h1 className="mt-7 text-5xl leading-[1.04] font-semibold tracking-tight sm:text-6xl xl:text-[4.1rem]">
              Always know your
              <br />
              <RotatingWords words={["progress.", "team.", "milestones.", "next step."]} className="text-gradient" />
              <br />
              <span className="text-white/45">Without asking.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/60 xl:mx-0">
              Your private portal shows how far your project has come, which team is building it and what the company has already delivered. You approve the work, and you can ask for more in one step.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3 xl:justify-start">
              <Magnetic>
                <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-night shadow-[0_10px_30px_-10px_rgb(255_255_255_/_0.35)]">
                  Sign in to your portal
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <a href="#access" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                  How you get access
                </a>
              </Magnetic>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl px-6 py-10">
            <PortalPreview />
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className={clsx(container, "py-24 lg:py-32")}>
        <div className="max-w-5xl">
          <ScrollRevealText
            text="You shouldn't have to chase anyone for an update. When a company runs on WorkNest, your project speaks for itself: the progress is live, the team is named, and nothing is finished until you say so."
            highlight={["live,", "named,", "you", "say", "so."]}
          />
        </div>
      </section>

      {/* What you get */}
      <section id="portal" className={clsx(container, "pb-28 lg:pb-36")}>
        <SectionIntro eyebrow="Your portal" title="Everything you need to trust the work." lead="Six things every client gets from the first day, with no setup on your side." />
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientBenefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: easeOut }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-indigo-400/40"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20">
                <b.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">{b.title}</h3>
              <p className="mt-2 text-white/55">{b.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Track record */}
      <section id="record" className="relative border-y border-white/5 bg-white/[0.015] py-28 lg:py-36">
        <div className={container}>
          <SectionIntro eyebrow="Track record" title="Judge the company on evidence, not promises." lead="Your dashboard shows the company's delivery record as live figures, drawn from the work it has actually done." />
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {record.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.1} className="border-glow rounded-[1.75rem] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8">
                <r.icon className="size-8 text-indigo-300" />
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{r.title}</h3>
                <p className="mt-3 text-white/55">{r.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How you get access */}
      <section id="access" className={clsx(container, "py-28 lg:py-36")}>
        <SectionIntro eyebrow="How it works" title="From invitation to sign-off." lead="No account to create and nothing to install. The company invites you, and your portal is ready." />
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
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">Already invited? Your portal is waiting.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">Sign in with the email your invitation was sent to. If your company isn&apos;t on WorkNest yet, show them what it does.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-night">
                  Sign in to your portal <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
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
