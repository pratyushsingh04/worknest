"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, BellRing, Building2, CheckCircle2, FolderKanban, Megaphone, Radio, Search, Send } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CompanyCard, ProjectCard } from "@/components/client/cards";
import { CEmpty, CErrorState, CLink, CLoader, Chip, Eyebrow, Face, Headline, Panel, Rise, SectionHead, requestChip } from "@/components/client/ui";
import { CountUp, easeOut } from "@/components/motion";
import { timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { ClientHome } from "@/lib/market-types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function ClientHomePage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<ClientHome>("/market/home");

  // Anything a company does on the client's work shows up without a refresh.
  useEffect(() => {
    const socket = getSocket();
    const events = ["notification", "request:changed", "need:changed"];
    events.forEach((e) => socket.on(e, reload));
    return () => events.forEach((e) => socket.off(e, reload));
  }, [reload]);

  if (loading) return <CLoader label="Gathering your work" />;
  if (error || !data) return <CErrorState message={error ?? "Could not load your portal"} onRetry={reload} />;

  const first = user.name.split(" ")[0];
  const hasWork = data.projects.length > 0;
  const stats = [
    { icon: FolderKanban, value: data.totals.active, label: "projects in delivery", href: "/client/projects" },
    { icon: BellRing, value: data.awaitingApproval.length, label: "waiting for your sign-off", href: "/client/projects" },
    { icon: CheckCircle2, value: data.totals.delivered, label: "delivered to you", href: "/client/projects" },
    { icon: Building2, value: data.totals.companies, label: "companies to choose from", href: "/client/companies" },
  ];

  return (
    <div className="space-y-16">
      {/* Greeting */}
      <section className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Eyebrow icon={Radio}>Your portal, live</Eyebrow>
          <Headline className="mt-4">{`${greeting()}, ${first}.`}</Headline>
          <motion.p className="mt-5 max-w-xl text-lg text-white/55" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: easeOut }}>
            {hasWork
              ? "Here is where every project stands, who is working on it and what needs you today."
              : "Find a company that fits, see exactly who works there and what they have delivered, then hand them your project."}
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6, ease: easeOut }}>
            <CLink href="/client/companies" size="lg">
              <Search className="size-4" /> Find a company
            </CLink>
            <CLink href="/client/needs" variant="soft" size="lg">
              <Megaphone className="size-4" /> Post what you need
            </CLink>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <Rise key={s.label} delay={0.15 + i * 0.07}>
              <Link href={s.href}>
                <Panel glow className="p-5">
                  <s.icon className="size-5 text-emerald-300" />
                  <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
                    <CountUp value={s.value} />
                  </p>
                  <p className="mt-1 text-xs text-white/45">{s.label}</p>
                </Panel>
              </Link>
            </Rise>
          ))}
        </div>
      </section>

      {/* Sign-offs */}
      {data.awaitingApproval.length > 0 && (
        <Rise>
          <Panel className="p-6 ring-1 ring-amber-400/25">
            <div className="flex items-center gap-3">
              <span className="relative flex size-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-400/20" />
                <BellRing className="relative size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Waiting for your sign-off</h2>
                <p className="text-sm text-white/50">Nothing is marked done until you approve it.</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.awaitingApproval.map((m) => (
                <li key={m.id}>
                  <Link href={`/client/projects/${m.project.id}`} className="group flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-3.5 transition-colors hover:bg-white/[0.08]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.title}</span>
                      <span className="block truncate text-xs text-white/45">
                        {m.project.name} · {m.project.company.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-300">
                      Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </Rise>
      )}

      {/* Projects */}
      <section>
        <SectionHead
          title="Your projects"
          hint={hasWork ? "Progress is counted from the tasks each team actually completes." : undefined}
          action={
            hasWork && (
              <CLink href="/client/projects" variant="ghost" size="sm">
                See all <ArrowRight className="size-4" />
              </CLink>
            )
          }
        />
        {hasWork ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.projects.slice(0, 6).map((p, i) => (
              <Rise key={p.id} delay={i * 0.06} className="h-full">
                <ProjectCard project={p} />
              </Rise>
            ))}
          </div>
        ) : (
          <Panel>
            <CEmpty
              icon={FolderKanban}
              title="No projects yet"
              text="Pick a company and ask one of its teams for work, or post what you need and let companies come to you. Your projects show up here with live progress."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <CLink href="/client/companies">Browse companies</CLink>
                  <CLink href="/client/needs" variant="soft">
                    Post a need
                  </CLink>
                </div>
              }
            />
          </Panel>
        )}
      </section>

      {/* Updates, requests, needs */}
      {(data.updates.length > 0 || data.requests.length > 0 || data.needs.length > 0) && (
        <section className="grid gap-5 lg:grid-cols-3">
          <Rise className="lg:col-span-2">
            <Panel className="h-full p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Latest updates</h2>
                <Chip tone="emerald">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </Chip>
              </div>
              {data.updates.length === 0 ? (
                <p className="mt-6 text-sm text-white/45">Updates from your teams will appear here as work moves.</p>
              ) : (
                <ol className="mt-5 space-y-1">
                  {data.updates.map((u, i) => (
                    <motion.li key={u.id} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="relative flex gap-3.5 pb-4 last:pb-0">
                      {i < data.updates.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-white/10" />}
                      <Face name={u.actor?.name ?? "WorkNest"} className="ring-0" />
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm text-white/65">
                          <span className="font-medium text-white">{u.actor?.name ?? "The team"}</span> {u.message}
                        </p>
                        <p className="mt-0.5 text-xs text-white/35">
                          {u.project && (
                            <Link href={`/client/projects/${u.project.id}`} className="hover:text-emerald-300">
                              {u.project.name} · {u.project.company.name}
                            </Link>
                          )}{" "}
                          · {timeAgo(u.createdAt)}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </Panel>
          </Rise>

          <div className="space-y-5">
            <Rise delay={0.08}>
              <Panel className="p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Send className="size-4 text-emerald-300" /> Requests in progress
                </h2>
                {data.requests.length === 0 ? (
                  <p className="mt-4 text-sm text-white/45">Nothing waiting on a company right now.</p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {data.requests.map((r) => (
                      <li key={r.id}>
                        <Link href="/client/projects#requests" className="block rounded-2xl bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.08]">
                          <span className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-medium">{r.title}</span>
                            <Chip tone={requestChip[r.status].tone}>{requestChip[r.status].label}</Chip>
                          </span>
                          <span className="mt-1 block truncate text-xs text-white/45">
                            {r.company.name} · {r.team.name} team
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </Rise>
            <Rise delay={0.14}>
              <Panel className="p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Megaphone className="size-4 text-emerald-300" /> Your open needs
                </h2>
                {data.needs.length === 0 ? (
                  <p className="mt-4 text-sm text-white/45">Describe a project once and every listed company can respond.</p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {data.needs.map((n) => (
                      <li key={n.id}>
                        <Link href="/client/needs" className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.08]">
                          <span className="truncate text-sm font-medium">{n.title}</span>
                          <Chip tone={n.proposals ? "emerald" : "neutral"}>
                            {n.proposals} {n.proposals === 1 ? "proposal" : "proposals"}
                          </Chip>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <CLink href="/client/needs" variant="soft" size="sm" className="mt-4 w-full">
                  {data.needs.length ? "Manage needs" : "Post a need"}
                </CLink>
              </Panel>
            </Rise>
          </div>
        </section>
      )}

      {/* Newest companies */}
      <section>
        <SectionHead
          title="New on WorkNest"
          hint="Companies that recently completed their profile. Their teams, people and record are real, not typed in."
          action={
            <CLink href="/client/companies" variant="ghost" size="sm">
              All companies <ArrowRight className="size-4" />
            </CLink>
          }
        />
        {data.newest.length === 0 ? (
          <Panel>
            <CEmpty icon={Building2} title="No companies are listed yet" text="As soon as a company finishes its public profile, it appears here for you to explore." />
          </Panel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.newest.map((c, i) => (
              <Rise key={c.id} delay={i * 0.06} className="h-full">
                <CompanyCard company={c} />
              </Rise>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
