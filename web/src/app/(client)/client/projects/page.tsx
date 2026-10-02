"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, Check, FolderKanban, Send, Wallet } from "lucide-react";
import { ProjectCard } from "@/components/client/cards";
import { CEmpty, CErrorState, CLink, CLoader, Chip, Eyebrow, Headline, Monogram, Panel, Rise, SectionHead, requestChip } from "@/components/client/ui";
import { formatDate, timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { ClientHome } from "@/lib/market-types";
import type { RequestStatus, ServiceRequest } from "@/lib/types";

const steps: RequestStatus[] = ["NEW", "IN_REVIEW", "ACCEPTED", "CONVERTED"];

/** Where a request has got to, as four dots that fill in. */
function RequestTrack({ status }: { status: RequestStatus }) {
  if (status === "DECLINED") return <Chip tone="rose">Declined</Chip>;
  const reached = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1.5" aria-label={`Status: ${requestChip[status].label}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
            className={clsx("flex size-5 items-center justify-center rounded-full text-[10px]", i <= reached ? "bg-emerald-400 text-night" : "bg-white/10 text-white/40")}
          >
            {i <= reached ? <Check className="size-3" /> : i + 1}
          </motion.span>
          {i < steps.length - 1 && <span className={clsx("h-0.5 w-5 rounded-full", i < reached ? "bg-emerald-400" : "bg-white/10")} />}
        </div>
      ))}
      <span className="ml-2 text-xs font-medium text-white/80">{requestChip[status].label}</span>
    </div>
  );
}

type Filter = "ACTIVE" | "DELIVERED" | "ALL";

export default function ClientProjectsPage() {
  const home = useApi<ClientHome>("/market/home");
  const requests = useApi<{ requests: ServiceRequest[] }>("/requests");
  const [filter, setFilter] = useState<Filter>("ALL");
  const reloadHome = home.reload;
  const reloadRequests = requests.reload;

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      reloadHome();
      reloadRequests();
    };
    socket.on("request:changed", refresh);
    return () => {
      socket.off("request:changed", refresh);
    };
  }, [reloadHome, reloadRequests]);

  if (home.loading) return <CLoader label="Loading your projects" />;
  if (home.error || !home.data) return <CErrorState message={home.error ?? "Could not load projects"} onRetry={home.reload} />;

  const projects = home.data.projects.filter((p) => (filter === "ALL" ? true : filter === "DELIVERED" ? p.status === "COMPLETED" : p.status !== "COMPLETED"));
  const open = (requests.data?.requests ?? []).filter((r) => r.status !== "CONVERTED");

  return (
    <div className="space-y-16">
      <section>
        <Eyebrow icon={FolderKanban}>Everything you have commissioned</Eyebrow>
        <Headline className="mt-4">Your projects.</Headline>
        <p className="mt-4 max-w-xl text-lg text-white/55">Across every company you work with. Open one to see milestones, the team on it and the conversation.</p>
      </section>

      <section>
        <div className="mb-5 flex gap-1.5">
          {(["ALL", "ACTIVE", "DELIVERED"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx("relative rounded-full px-4 py-2 text-sm font-medium transition-colors", filter === f ? "text-night" : "text-white/55 hover:text-white")}>
              {filter === f && <motion.span layoutId="client-project-filter" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{{ ALL: "All", ACTIVE: "In delivery", DELIVERED: "Delivered" }[f]}</span>
            </button>
          ))}
        </div>
        {projects.length === 0 ? (
          <Panel>
            <CEmpty
              icon={FolderKanban}
              title={home.data.projects.length === 0 ? "No projects yet" : "Nothing in this view"}
              text={home.data.projects.length === 0 ? "A project appears here as soon as a company accepts your request and starts work." : undefined}
              action={home.data.projects.length === 0 && <CLink href="/client/companies">Find a company</CLink>}
            />
          </Panel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => (
              <Rise key={p.id} delay={i * 0.05} className="h-full">
                <ProjectCard project={p} />
              </Rise>
            ))}
          </div>
        )}
      </section>

      <section id="requests" className="scroll-mt-28">
        <SectionHead title="Requests" hint="Work you have asked a team for. Once accepted, the team lead turns it into a project." />
        {requests.loading ? (
          <CLoader label="Loading requests" />
        ) : open.length === 0 ? (
          <Panel>
            <CEmpty icon={Send} title="No open requests" text="Open a company, pick a team and ask for one of its services." />
          </Panel>
        ) : (
          <div className="space-y-4">
            {open.map((r, i) => (
              <Rise key={r.id} delay={i * 0.04}>
                <Panel className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <Monogram name={r.company.name} />
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">{r.title}</h3>
                        <p className="mt-0.5 text-sm text-white/50">
                          <Link href={`/client/companies/${r.company.slug}`} className="hover:text-emerald-300">
                            {r.company.name}
                          </Link>{" "}
                          · {r.team.name} team{r.service && ` · ${r.service.title}`}
                        </p>
                      </div>
                    </div>
                    <RequestTrack status={r.status} />
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm whitespace-pre-line text-white/60">{r.details}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                    {r.budget && (
                      <span className="flex items-center gap-1">
                        <Wallet className="size-3.5" /> {r.budget}
                      </span>
                    )}
                    {r.deadline && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> Needed by {formatDate(r.deadline)}
                      </span>
                    )}
                    <span>Sent {timeAgo(r.createdAt)}</span>
                  </div>
                  {r.response && (
                    <div className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                      <span className="font-medium text-white">{r.company.name}:</span> {r.response}
                    </div>
                  )}
                  {r.project && (
                    <Link href={`/client/projects/${r.project.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 hover:underline">
                      Follow the project <ArrowRight className="size-4" />
                    </Link>
                  )}
                </Panel>
              </Rise>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
