"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Clock, Eye, EyeOff, Layers, RotateCw, Users } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui";
import { formatINR, teamColor } from "@/lib/team-colors";
import type { TeamColor, TeamService } from "@/lib/types";

interface CardTeam {
  id: string;
  name: string;
  tagline: string | null;
  color: TeamColor;
  skills: string[];
  lead: { name: string; designation?: string | null } | null;
  members: { user: { name: string } }[];
  services?: TeamService[];
  visibleToClients?: boolean;
  stats: { label: string; value: number }[];
}

function AvatarStack({ names, max = 5 }: { names: string[]; max?: number }) {
  return (
    <div className="flex -space-x-2">
      {names.slice(0, max).map((n) => (
        <span key={n} className="rounded-full ring-2 ring-white">
          <Avatar name={n} size="sm" />
        </span>
      ))}
      {names.length > max && <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-muted ring-2 ring-white">+{names.length - max}</span>}
    </div>
  );
}

/**
 * A team card that flips in 3D: the front introduces the team, the back lists what
 * it offers. Hover flips it on desktop; the corner button flips it on touch screens.
 */
export function TeamFlipCard({ team, href }: { team: CardTeam; href: string }) {
  const [flipped, setFlipped] = useState(false);
  const c = teamColor[team.color];
  const names = [...new Set([...(team.lead ? [team.lead.name] : []), ...team.members.map((m) => m.user.name)])];

  return (
    <div className="group h-80" style={{ perspective: 1400 }} onMouseEnter={() => setFlipped(true)} onMouseLeave={() => setFlipped(false)}>
      <motion.div className="preserve-3d relative size-full" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
        {/* Front */}
        <Link href={href} className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(17,17,24,0.04)] [backface-visibility:hidden]">
          <div className={clsx("relative h-28 shrink-0 bg-gradient-to-br p-5 text-white", c.gradient)}>
            <div className="absolute inset-0 bg-grid opacity-60" />
            <div className="relative flex items-start justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-lg font-semibold ring-1 ring-white/25 backdrop-blur">
                {team.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              {team.visibleToClients !== undefined && (
                <span className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">
                  {team.visibleToClients ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  {team.visibleToClients ? "Visible to clients" : "Internal"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="text-lg font-semibold tracking-tight">{team.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">{team.tagline ?? "No tagline yet"}</p>
            <div className="mt-auto flex items-end justify-between pt-4">
              <div>
                <p className="text-xs text-muted">{team.lead ? `Led by ${team.lead.name}` : "No lead yet"}</p>
                <div className="mt-1.5">
                  <AvatarStack names={names} />
                </div>
              </div>
              <div className="flex gap-4 text-right">
                {team.stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-lg font-semibold">{s.value}</p>
                    <p className="text-[11px] text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Link>

        {/* Back */}
        <Link
          href={href}
          className={clsx("absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]", c.gradient)}
        >
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-semibold">{team.name}</p>
            <ArrowUpRight className="size-4 opacity-80" />
          </div>
          <p className="relative mt-3 text-xs font-medium tracking-wider text-white/70 uppercase">What we do</p>
          <ul className="relative mt-2 space-y-1.5">
            {(team.services ?? []).slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm">
                <span className="truncate">{s.title}</span>
                {s.startingPrice != null && <span className="shrink-0 text-xs text-white/75">from {formatINR(s.startingPrice)}</span>}
              </li>
            ))}
            {!team.services?.length && <li className="text-sm text-white/70">Services haven&apos;t been added yet.</li>}
          </ul>
          <div className="relative mt-auto flex flex-wrap gap-1.5 pt-3">
            {team.skills.slice(0, 6).map((s) => (
              <span key={s} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                {s}
              </span>
            ))}
          </div>
        </Link>
      </motion.div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative -mt-10 ml-auto mr-3 flex size-7 items-center justify-center rounded-full bg-white/90 text-muted shadow ring-1 ring-line sm:hidden"
        aria-label={flipped ? "Show team overview" : "Show team services"}
      >
        <RotateCw className="size-3.5" />
      </button>
    </div>
  );
}

/** A service tile with a gentle 3D lift, used on the client-facing team page. */
export function ServiceCard({ service, color, action }: { service: TeamService; color: TeamColor; action?: React.ReactNode }) {
  const c = teamColor[color];
  return (
    <motion.div whileHover={{ y: -4, rotateX: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformPerspective: 900 }} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(17,17,24,0.04)] hover:shadow-[0_20px_40px_-26px_rgba(17,17,24,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <span className={clsx("flex size-10 items-center justify-center rounded-xl ring-1", c.soft, c.text, c.ring)}>
          <Layers className="size-5" />
        </span>
        {service.startingPrice != null && (
          <div className="text-right">
            <p className="text-[11px] text-muted">Starting at</p>
            <p className="font-semibold">{formatINR(service.startingPrice)}</p>
          </div>
        )}
      </div>
      <h3 className="mt-4 font-semibold">{service.title}</h3>
      <p className="mt-1 text-sm text-muted">{service.description}</p>
      {service.deliverables.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {service.deliverables.map((d) => (
            <li key={d} className="flex items-start gap-2">
              <span className={clsx("mt-1.5 size-1.5 shrink-0 rounded-full", c.dot)} /> {d}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        {service.turnaround ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="size-3.5" /> {service.turnaround}
          </span>
        ) : (
          <span />
        )}
        {action}
      </div>
    </motion.div>
  );
}

export function TeamStatPill({ icon: Icon = Users, children }: { icon?: typeof Users; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
      <Icon className="size-3.5" /> {children}
    </span>
  );
}
