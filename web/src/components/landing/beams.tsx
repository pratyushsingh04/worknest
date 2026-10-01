"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Briefcase, FolderKanban, Inbox, ShieldCheck, Users, UsersRound, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/logo";

interface Node {
  label: string;
  sub: string;
  icon: LucideIcon;
  x: number; // % of the stage width
  y: number; // % of the stage height
  inbound: boolean; // light flows toward the hub (true) or out to the node (false)
}

const nodes: Node[] = [
  { label: "Admin", sub: "Sets up everything", icon: ShieldCheck, x: 12, y: 18, inbound: true },
  { label: "Teams", sub: "Leads & members", icon: UsersRound, x: 7, y: 50, inbound: true },
  { label: "Employees", sub: "Check-ins & tasks", icon: Users, x: 12, y: 82, inbound: true },
  { label: "Clients", sub: "Portal & approvals", icon: Briefcase, x: 88, y: 18, inbound: false },
  { label: "Projects", sub: "Live progress", icon: FolderKanban, x: 93, y: 50, inbound: false },
  { label: "Requests", sub: "Become projects", icon: Inbox, x: 88, y: 82, inbound: false },
];

const HUB = { x: 50, y: 50 };

/** Cubic curve (in pixels) from a node to the hub, bending horizontally like a cable. */
function pathFor(n: Node, w: number, h: number) {
  const [x, y, hx, hy] = [(n.x / 100) * w, (n.y / 100) * h, (HUB.x / 100) * w, (HUB.y / 100) * h];
  const midX = (x + hx) / 2;
  return n.inbound ? `M ${x} ${y} C ${midX} ${y}, ${midX} ${hy}, ${hx} ${hy}` : `M ${hx} ${hy} C ${midX} ${hy}, ${midX} ${y}, ${x} ${y}`;
}

/** Everyone wired into one workspace, with pulses of light travelling along each connection. */
export function BeamsNetwork() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  // Real pixel size, so dash lengths and stroke widths aren't stretched.
  const [size, setSize] = useState({ w: 1000, h: 500 });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={stage} className="relative mx-auto aspect-[16/9] w-full max-w-5xl sm:aspect-[2/1]">
      <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
        {nodes.map((n, i) => (
          <g key={n.label}>
            <path d={pathFor(n, size.w, size.h)} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={1.5} />
            {!reduced && (
              <motion.path
                d={pathFor(n, size.w, size.h)}
                fill="none"
                stroke="#a5b4fc"
                strokeWidth={2.5}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="18 100"
                initial={{ strokeDashoffset: 118 }}
                animate={{ strokeDashoffset: -18 }}
                transition={{ duration: 2.4, delay: i * 0.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 0 4px rgb(129 140 248 / 0.9))" }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex size-24 items-center justify-center rounded-3xl border border-white/10 bg-night-2 shadow-[0_0_60px_-10px_rgb(99_102_241_/_0.7)] sm:size-28">
          <span className="absolute inset-0 animate-pulse-ring rounded-3xl border border-indigo-400/40" />
          <LogoMark className="size-12 sm:size-14" />
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white">WorkNest</p>
      </div>

      {/* Nodes */}
      {nodes.map((n, i) => (
        <motion.div
          key={n.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 220, damping: 18 }}
        >
          <div className="flex animate-float flex-col items-center" style={{ animationDelay: `${i * 0.7}s` }}>
            <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-night-2 text-indigo-200 shadow-xl sm:size-14">
              <n.icon className="size-5 sm:size-6" />
            </span>
            <p className="mt-2 text-xs font-semibold text-white sm:text-sm">{n.label}</p>
            <p className="hidden text-[11px] text-white/45 sm:block">{n.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
