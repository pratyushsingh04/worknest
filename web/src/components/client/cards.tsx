"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import { Chip, Monogram, Panel, Ring, Tilt, projectChip, teamTint } from "@/components/client/ui";
import { formatDate, timeAgo } from "@/lib/format";
import type { ClientProject, CompanyCard as Company } from "@/lib/market-types";

/** A company in the directory: who they are, what they are good at, and their record. */
export function CompanyCard({ company: c }: { company: Company }) {
  return (
    <Tilt className="h-full">
      <Link href={`/client/companies/${c.slug}`} className="block h-full focus:outline-none">
        <Panel glow className="flex h-full flex-col p-6 transition-shadow duration-300 hover:shadow-[0_30px_80px_-40px_rgb(52_211_153_/_0.6)]">
          <div className="flex items-start gap-4" style={{ transform: "translateZ(30px)" }}>
            <Monogram name={c.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold tracking-tight">{c.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
                <MapPin className="size-3" />
                {[c.city, c.country].filter(Boolean).join(", ")}
                {c.industry && <span className="truncate">· {c.industry}</span>}
              </p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-white/30 transition-all duration-300 group-hover/panel:translate-x-0.5 group-hover/panel:-translate-y-0.5 group-hover/panel:text-emerald-300" />
          </div>

          <p className="mt-4 line-clamp-2 text-sm font-medium text-white/85">{c.tagline}</p>
          <p className="mt-1.5 line-clamp-2 text-sm text-white/45">{c.about}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.specialities.slice(0, 4).map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
            {c.specialities.length > 4 && <Chip>+{c.specialities.length - 4}</Chip>}
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 pt-6 text-center">
            {[
              { v: c.delivered, l: "delivered" },
              { v: c.teams, l: c.teams === 1 ? "team" : "teams" },
              { v: c.people, l: "people" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/[0.04] py-2.5">
                <p className="text-lg font-semibold tabular-nums">{s.v}</p>
                <p className="text-[11px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Link>
    </Tilt>
  );
}

/** One of the client's projects: how far along, who is on it, and the latest word. */
export function ProjectCard({ project: p }: { project: ClientProject }) {
  const status = projectChip[p.status];
  const tint = p.team ? teamTint[p.team.color] : teamTint.emerald;
  return (
    <Tilt className="h-full" max={5}>
      <Link href={`/client/projects/${p.id}`} className="block h-full focus:outline-none">
        <Panel glow className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Monogram name={p.company.name} size="sm" className="!size-6 !rounded-lg !text-[10px]" />
                <span className="truncate">{p.company.name}</span>
              </p>
              <h3 className="mt-2.5 text-xl leading-snug font-semibold tracking-tight">{p.name}</h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Chip tone={status.tone}>{status.label}</Chip>
                {p.dueDate && <span className="text-xs text-white/40">Due {formatDate(p.dueDate)}</span>}
              </div>
            </div>
            <Ring percent={p.progress.percent} size={84} stroke={7} color={p.status === "COMPLETED" ? "#a78bfa" : tint.stroke} />
          </div>

          {p.team && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className={`size-2 rounded-full ${tint.dot}`} />
                  <span className="truncate">{p.team.name} team</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-white/45">{p.team.lead ? `Led by ${p.team.lead.name}` : "Lead to be named"}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/50">
                <UsersRound className="size-3.5" /> {p.team._count.members}
              </span>
            </div>
          )}

          <p className="mt-auto pt-5 text-sm text-white/50">
            {p.lastUpdate ? (
              <>
                <span className="text-white/80">{p.lastUpdate.actor?.name ?? "The team"}</span> {p.lastUpdate.message} <span className="text-white/35">· {timeAgo(p.lastUpdate.createdAt)}</span>
              </>
            ) : (
              "No updates yet. They appear here the moment work starts."
            )}
          </p>
        </Panel>
      </Link>
    </Tilt>
  );
}
