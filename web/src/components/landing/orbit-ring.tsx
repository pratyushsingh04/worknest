"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { BarChart3, CalendarCheck, CheckCircle2, Inbox, MapPin, Rocket, ThumbsUp, UserPlus, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface Widget {
  icon: LucideIcon;
  tint: string;
  title: string;
  sub: string;
  extra?: "progress" | "bars" | "avatars";
}

const widgets: Widget[] = [
  { icon: MapPin, tint: "text-emerald-300 bg-emerald-400/10", title: "Check-in verified", sub: "Inside office radius · on time" },
  { icon: CheckCircle2, tint: "text-indigo-300 bg-indigo-400/10", title: "Task moved to Done", sub: "Mobile app · checkout screen", extra: "progress" },
  { icon: ThumbsUp, tint: "text-sky-300 bg-sky-400/10", title: "Milestone approved", sub: "Approved by the client" },
  { icon: Inbox, tint: "text-amber-300 bg-amber-400/10", title: "New client request", sub: "Brand identity · Design team" },
  { icon: UserPlus, tint: "text-rose-300 bg-rose-400/10", title: "Invite accepted", sub: "Joined Engineering", extra: "avatars" },
  { icon: CalendarCheck, tint: "text-emerald-300 bg-emerald-400/10", title: "Leave approved", sub: "Balance updated" },
  { icon: BarChart3, tint: "text-indigo-300 bg-indigo-400/10", title: "Attendance this week", sub: "Live, per day", extra: "bars" },
  { icon: Rocket, tint: "text-sky-300 bg-sky-400/10", title: "Project started", sub: "From a client request" },
];

function Extra({ kind }: { kind: Widget["extra"] }) {
  if (kind === "progress")
    return (
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-3/4 rounded-full bg-indigo-400" />
      </div>
    );
  if (kind === "bars")
    return (
      <div className="mt-3 flex h-8 items-end gap-1">
        {[60, 85, 95, 70, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-[3px] bg-indigo-400/80" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  if (kind === "avatars")
    return (
      <div className="mt-3 flex -space-x-1.5">
        {["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"].map((c) => (
          <span key={c} className={clsx("size-5 rounded-full ring-2 ring-night-2", c)} />
        ))}
      </div>
    );
  return null;
}

/** One card on the ring. It is placed around the circle but always turned to face the viewer. */
function OrbitCard({ widget, angle, spin, radius, compact }: { widget: Widget; angle: number; spin: MotionValue<number>; radius: number; compact: boolean }) {
  const transform = useTransform(spin, (r) => `translate(-50%, -50%) rotateY(${r + angle}deg) translateZ(${radius}px) rotateY(${-(r + angle)}deg)`);
  // cos = 1 at the front of the ring, -1 at the back.
  const facing = useTransform(spin, (r) => Math.cos(((r + angle) * Math.PI) / 180));
  const opacity = useTransform(facing, (f) => 0.18 + 0.82 * Math.max(0, (f + 0.35) / 1.35));
  const zIndex = useTransform(facing, (f) => Math.round((f + 1) * 50));

  return (
    <motion.div className={clsx("absolute top-0 left-0", compact ? "w-48" : "w-56")} style={{ transform, opacity, zIndex }}>
      <div className="border-glow rounded-2xl bg-night-2/95 p-4 shadow-[0_30px_60px_-24px_rgb(0_0_0_/_0.9)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl", widget.tint)}>
            <widget.icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{widget.title}</p>
            <p className="truncate text-xs text-white/45">{widget.sub}</p>
          </div>
        </div>
        <Extra kind={widget.extra} />
      </div>
    </motion.div>
  );
}

/**
 * Live product events orbiting in 3D. Spins on its own, speeds up with scroll,
 * and can be dragged. Reduced-motion users get a still ring.
 */
export function OrbitRing({
  center,
  heightClass = "h-[260px] sm:h-[300px]",
  radiusFactor = 0.34,
  maxRadius = 440,
  compact = false,
}: {
  /** Something to sit in the middle of the ring (cards pass in front of and behind it). */
  center?: ReactNode;
  heightClass?: string;
  radiusFactor?: number;
  maxRadius?: number;
  compact?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const spin = useTransform([base, scrollY], ([b, s]: number[]) => b + s * 0.12);
  const [radius, setRadius] = useState(420);
  const drag = useRef<{ x: number; start: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setRadius(Math.max(160, Math.min(maxRadius, entry.contentRect.width * radiusFactor))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxRadius, radiusFactor]);

  useAnimationFrame((_, delta) => {
    if (reduced || drag.current) return;
    base.set(base.get() + delta * 0.009);
  });

  return (
    <div
      ref={wrap}
      className={clsx("relative w-full cursor-grab touch-pan-y select-none active:cursor-grabbing", heightClass)}
      style={{ perspective: 1400 }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: base.get() };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) base.set(drag.current.start + (e.clientX - drag.current.x) * 0.25);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      aria-label="Examples of live events in WorkNest"
      role="img"
    >
      {/* A faint floor ellipse grounds the ring. */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-[80%] -translate-x-1/2 translate-y-8 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgb(99_102_241_/_0.22),transparent_70%)]" />
      <div className="preserve-3d absolute top-1/2 left-1/2" style={{ transform: "rotateX(-10deg)" }}>
        {/* The centrepiece lives on the ring's Z=0 plane, so nearer cards cover it and farther ones hide behind it. */}
        {center && (
          <div className="absolute top-0 left-0" style={{ transform: "translate(-50%, -50%) rotateX(10deg)" }} onPointerDown={(e) => e.stopPropagation()}>
            {center}
          </div>
        )}
        {widgets.map((w, i) => (
          <OrbitCard key={w.title} widget={w} angle={(i * 360) / widgets.length} spin={spin} radius={radius} compact={compact} />
        ))}
      </div>
    </div>
  );
}
