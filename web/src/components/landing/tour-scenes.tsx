"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Factory, Home, MapPin, Package, Ship, ThumbsUp, Truck, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { easeOut } from "@/components/motion";

// Illustrated scenes for the tour film: drone passes over a city, a plant and a port,
// an order travelling to its customer, and the client's portal. Everything is a pure
// function of `t` (milliseconds since the scene began), so the film can pause and scrub.

export interface SceneProps {
  t: number;
}

export function Place({ children }: { children: string }) {
  return (
    <motion.p className="flex items-center gap-2 text-sm font-medium tracking-[0.2em] text-emerald-300 uppercase" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
      <MapPin className="size-4" /> {children}
    </motion.p>
  );
}

export function Line({ children, delay = 0.15, small }: { children: string; delay?: number; small?: boolean }) {
  return (
    <h2 className={clsx("mt-4 leading-[1.1] font-semibold tracking-tight", small ? "text-2xl sm:text-4xl" : "text-3xl sm:text-5xl")}>
      {children.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1.5 align-bottom">
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.7, delay: delay + i * 0.045, ease: easeOut }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

export function Sub({ children }: { children: string }) {
  return (
    <motion.p className="mt-4 max-w-lg text-base text-white/60 sm:text-lg" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7, ease: easeOut }}>
      {children}
    </motion.p>
  );
}

const W = 1600;
const H = 900;
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const ease = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
/** Repeatable "random": the same index always gives the same value, so nothing flickers between frames. */
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// ---- Drone shots ------------------------------------------------------------

type Variant = "city" | "factory" | "port";

const shots: Record<Variant, { place: string; coords: string; line: string; sub: string; sky: [string, string, string]; sun: string; chips: { at: number; x: number; y: number; text: string }[] }> = {
  city: {
    place: "Bengaluru · Tech district",
    coords: "12.9716° N  77.5946° E",
    line: "In one city, studios and agencies start their day.",
    sub: "Design teams, software firms and consultancies, each with its own workspace, people and clients.",
    sky: ["#060714", "#1b1b4b", "#7c3a5e"],
    sun: "#fb923c",
    chips: [
      { at: 2200, x: 20, y: 56, text: "Design studio · team checked in" },
      { at: 4200, x: 52, y: 48, text: "Software firm · 3 projects in delivery" },
      { at: 6200, x: 80, y: 40, text: "Consultancy · client review at 11:00" },
    ],
  },
  factory: {
    place: "Pune · Manufacturing plant",
    coords: "18.5204° N  73.8567° E",
    line: "On a factory floor, shifts and teams run to plan.",
    sub: "Who is on site, which team owns which order and what is due today, all in one place.",
    sky: ["#070a14", "#14284a", "#35607a"],
    sun: "#fde68a",
    chips: [
      { at: 2200, x: 34, y: 52, text: "Shift A · on site and verified" },
      { at: 4400, x: 76, y: 36, text: "Assembly team · today's tasks assigned" },
      { at: 6800, x: 62, y: 70, text: "Order packed · milestone updated" },
    ],
  },
  port: {
    place: "Mumbai · Container port",
    coords: "18.9490° N  72.9500° E",
    line: "At the port, every consignment is a project someone owns.",
    sub: "The logistics team moves the milestone forward, and the client sees it the same second.",
    sky: ["#050a16", "#0f2f52", "#2d6a8a"],
    sun: "#fca5a5",
    chips: [
      { at: 2400, x: 18, y: 54, text: "Loading complete · team lead signed" },
      { at: 5000, x: 56, y: 62, text: "Consignment shipped · client notified" },
      { at: 7600, x: 80, y: 40, text: "Next milestone · arrival at destination" },
    ],
  },
};

/** A row of buildings wider than the frame, so the camera can travel along it. */
function skyline(seed: number, minH: number, maxH: number, minW: number, maxW: number) {
  const out: { x: number; w: number; h: number; id: number }[] = [];
  let x = -300;
  for (let i = 0; x < W + 700; i++) {
    const w = minW + rnd(seed + i) * (maxW - minW);
    out.push({ x, w, h: minH + rnd(seed + i * 7.1) * (maxH - minH), id: i });
    x += w + rnd(seed + i * 3.3) * 10;
  }
  return out;
}

const far = skyline(11, 90, 240, 50, 110);
const mid = skyline(47, 160, 400, 70, 150);
const near = skyline(83, 80, 230, 110, 220);
const street = skyline(140, 120, 300, 110, 200);
const GROUND = 720;

const CityFar = memo(function CityFar() {
  return (
    <>
      {far.map((b) => (
        <rect key={b.id} x={b.x} y={GROUND - 60 - b.h} width={b.w} height={b.h + 60} fill="#141736" />
      ))}
    </>
  );
});

const CityMid = memo(function CityMid() {
  return (
    <>
      {mid.map((b) => {
        const cols = Math.floor((b.w - 16) / 16);
        const rows = Math.floor((b.h - 20) / 22);
        return (
          <g key={b.id}>
            <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} fill="#1c2046" />
            <rect x={b.x} y={GROUND - b.h} width={b.w} height={5} fill="#2b3070" />
            {rnd(b.id * 2.7) > 0.6 && <rect x={b.x + b.w / 2 - 2} y={GROUND - b.h - 36} width={4} height={36} fill="#2b3070" />}
            {Array.from({ length: rows * cols }, (_, k) => {
              const lit = rnd(b.id * 31 + k) > 0.52;
              return <rect key={k} x={b.x + 10 + (k % cols) * 16} y={GROUND - b.h + 14 + Math.floor(k / cols) * 22} width={9} height={12} rx={1} fill={lit ? (rnd(b.id + k * 1.7) > 0.75 ? "#a5b4fc" : "#fcd9a0") : "#252a5c"} opacity={lit ? 0.9 : 1} />;
            })}
          </g>
        );
      })}
    </>
  );
});

const CityNear = memo(function CityNear() {
  return (
    <>
      {near.map((b) => (
        <g key={b.id}>
          <rect x={b.x} y={GROUND + 40 - b.h} width={b.w} height={b.h + 200} fill="#0b0d22" />
          {Array.from({ length: Math.floor(b.w / 26) }, (_, k) => rnd(b.id * 13 + k) > 0.5 && <rect key={k} x={b.x + 12 + k * 26} y={GROUND + 58 - b.h} width={12} height={7} fill="#34d399" opacity={0.5} />)}
        </g>
      ))}
    </>
  );
});

const containerHues = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#e5e7eb", "#f97316"];

const FactoryStatic = memo(function FactoryStatic() {
  return (
    <>
      {/* Far hills and pylons */}
      <path d={`M-200 ${GROUND - 40} Q 200 ${GROUND - 170} 620 ${GROUND - 70} T 1300 ${GROUND - 90} T 2200 ${GROUND - 40} V ${GROUND} H -200 Z`} fill="#10233f" />
      {[120, 520, 1500, 1900].map((x) => (
        <g key={x} stroke="#24456b" strokeWidth="3" fill="none">
          <path d={`M${x} ${GROUND - 40} L${x + 26} ${GROUND - 230} L${x + 52} ${GROUND - 40} M${x - 20} ${GROUND - 190} H${x + 72} M${x - 10} ${GROUND - 150} H${x + 62}`} />
        </g>
      ))}
      {/* Ground */}
      <rect x={-300} y={GROUND - 4} width={W + 1000} height={300} fill="#0b1626" />
      <rect x={-300} y={GROUND + 70} width={W + 1000} height={70} fill="#111f33" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={-260 + i * 90} y={GROUND + 102} width={46} height={5} fill="#f8fafc" opacity={0.35} />
      ))}

      {/* Main hall with a saw-tooth roof */}
      <rect x={420} y={GROUND - 210} width={640} height={210} fill="#1d3557" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${420 + i * 80} ${GROUND - 210} L${420 + i * 80} ${GROUND - 268} L${500 + i * 80} ${GROUND - 210} Z`} fill="#27476f" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${420 + i * 80} ${GROUND - 216} L${420 + i * 80} ${GROUND - 262} L${426 + i * 80} ${GROUND - 258} L${426 + i * 80} ${GROUND - 214} Z`} fill="#fde68a" opacity={0.75} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={446 + i * 43} y={GROUND - 150} width={26} height={34} rx={2} fill={rnd(i * 5.1) > 0.3 ? "#fcd9a0" : "#16304f"} opacity={0.9} />
      ))}
      <rect x={640} y={GROUND - 84} width={150} height={84} fill="#0b1626" />
      <rect x={640} y={GROUND - 84} width={150} height={10} fill="#f59e0b" />

      {/* Office block */}
      <rect x={1080} y={GROUND - 300} width={210} height={300} fill="#223f66" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={1098 + (i % 5) * 38} y={GROUND - 280 + Math.floor(i / 5) * 44} width={24} height={26} rx={2} fill={rnd(i * 2.3) > 0.4 ? "#bfdbfe" : "#16304f"} opacity={0.85} />
      ))}

      {/* Chimneys */}
      {[470, 560, 930].map((x, i) => (
        <g key={x}>
          <rect x={x} y={GROUND - 420 + i * 30} width={34} height={210 - i * 30} fill="#2a4a73" />
          <rect x={x - 4} y={GROUND - 420 + i * 30} width={42} height={12} fill="#ef4444" />
          <rect x={x - 4} y={GROUND - 388 + i * 30} width={42} height={8} fill="#f8fafc" opacity={0.8} />
        </g>
      ))}

      {/* Storage tanks */}
      {[180, 280].map((x) => (
        <g key={x}>
          <rect x={x} y={GROUND - 170} width={86} height={170} rx={10} fill="#27476f" />
          <ellipse cx={x + 43} cy={GROUND - 170} rx={43} ry={12} fill="#35607a" />
          <rect x={x + 8} y={GROUND - 120} width={70} height={6} fill="#16304f" />
          <rect x={x + 8} y={GROUND - 70} width={70} height={6} fill="#16304f" />
        </g>
      ))}

      {/* Loading bay and conveyor frame */}
      <rect x={790} y={GROUND - 34} width={420} height={8} fill="#64748b" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={800 + i * 56} y={GROUND - 26} width={6} height={26} fill="#475569" />
      ))}
    </>
  );
});

function TruckShape({ x, y, hue = "#e2e8f0", flip }: { x: number; y: number; hue?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`}>
      <rect x={0} y={-74} width={150} height={66} rx={4} fill={hue} />
      <rect x={10} y={-64} width={130} height={5} fill="#0f172a" opacity={0.15} />
      <path d="M150 -52 H186 L206 -28 V-8 H150 Z" fill="#4f46e5" />
      <path d="M160 -46 H183 L197 -28 H160 Z" fill="#bfdbfe" />
      <rect x={-4} y={-10} width={214} height={6} fill="#1e293b" />
      {[34, 112, 178].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={0} r={15} fill="#0f172a" />
          <circle cx={cx} cy={0} r={6} fill="#94a3b8" />
        </g>
      ))}
    </g>
  );
}

const PortStatic = memo(function PortStatic() {
  return (
    <>
      {/* Far shore */}
      <path d={`M-300 ${GROUND - 150} Q 300 ${GROUND - 215} 900 ${GROUND - 160} T 2400 ${GROUND - 150} V ${GROUND - 120} H -300 Z`} fill="#0e2742" />
      {/* Quay */}
      <rect x={-300} y={GROUND - 128} width={1150} height={46} fill="#16304f" />
      <rect x={-300} y={GROUND - 128} width={1150} height={6} fill="#f59e0b" opacity={0.8} />
      {/* Stacked containers */}
      {Array.from({ length: 44 }, (_, i) => {
        const col = i % 11;
        const row = Math.floor(i / 11);
        if (rnd(i * 4.4) < row * 0.22) return null;
        return <rect key={i} x={-220 + col * 66} y={GROUND - 158 - row * 30} width={62} height={28} rx={2} fill={containerHues[Math.floor(rnd(i * 9.1) * containerHues.length)]} opacity={0.92} />;
      })}
      {/* Gantry cranes */}
      {[560, 730].map((x) => (
        <g key={x} stroke="#f97316" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d={`M${x} ${GROUND - 128} V${GROUND - 420} M${x + 90} ${GROUND - 128} V${GROUND - 420} M${x - 40} ${GROUND - 420} H${x + 330} M${x} ${GROUND - 330} H${x + 90}`} />
          <path d={`M${x + 45} ${GROUND - 500} L${x - 40} ${GROUND - 420} M${x + 45} ${GROUND - 500} L${x + 330} ${GROUND - 420} M${x + 45} ${GROUND - 500} V${GROUND - 420}`} strokeWidth="4" />
        </g>
      ))}
    </>
  );
});

const ShipShape = memo(function ShipShape() {
  return (
    <g>
      {/* Hull */}
      <path d="M0 0 H760 L800 -40 H830 L790 62 Q780 80 760 80 H60 Q30 80 22 56 Z" fill="#1e293b" />
      <path d="M22 56 Q30 80 60 80 H760 Q780 80 790 62 L796 46 H18 Z" fill="#b91c1c" />
      <rect x={30} y={18} width={730} height={4} fill="#f8fafc" opacity={0.5} />
      {/* Containers on deck */}
      {Array.from({ length: 60 }, (_, i) => {
        const col = i % 12;
        const row = Math.floor(i / 12);
        if (row > 2 && rnd(i * 3.7) > 0.55) return null;
        return <rect key={i} x={170 + col * 48} y={-30 - row * 26} width={45} height={24} rx={2} fill={containerHues[Math.floor(rnd(i * 6.3) * containerHues.length)]} />;
      })}
      {/* Bridge */}
      <rect x={40} y={-120} width={110} height={120} fill="#f1f5f9" />
      <rect x={30} y={-142} width={130} height={24} fill="#e2e8f0" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={40 + i * 22} y={-136} width={16} height={11} fill="#0ea5e9" opacity={0.85} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={50 + (i % 4) * 24} y={-100 + Math.floor(i / 4) * 34} width={14} height={14} fill="#94a3b8" />
      ))}
      <rect x={76} y={-196} width={40} height={56} fill="#4f46e5" />
      <rect x={76} y={-176} width={40} height={10} fill="#f8fafc" />
    </g>
  );
});

function Smoke({ x, y, t, drift = 1, tone = "#cbd5e1" }: { x: number; y: number; t: number; drift?: number; tone?: string }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, k) => {
        const phase = (t / 4200 + k / 6) % 1;
        return <circle key={k} cx={x + phase * 90 * drift + Math.sin(phase * 6 + k) * 8} cy={y - phase * 170} r={12 + phase * 34} fill={tone} opacity={(1 - phase) * 0.28} />;
      })}
    </>
  );
}

function Hud({ place, coords, t, altitude }: { place: string; coords: string; t: number; altitude: number }) {
  const s = Math.floor(t / 1000);
  const f = Math.floor((t % 1000) / 40);
  const corner = "absolute size-10 border-white/60";
  return (
    <div className="pointer-events-none absolute inset-0 font-mono text-[11px] tracking-wider text-white/75 sm:text-xs">
      <span className={clsx(corner, "top-5 left-5 border-t-2 border-l-2")} />
      <span className={clsx(corner, "top-5 right-5 border-t-2 border-r-2")} />
      <span className={clsx(corner, "bottom-5 left-5 border-b-2 border-l-2")} />
      <span className={clsx(corner, "right-5 bottom-5 border-r-2 border-b-2")} />
      <div className="absolute bottom-8 left-9 flex items-center gap-2">
        <span className={clsx("size-2.5 rounded-full bg-red-500", Math.floor(t / 600) % 2 ? "opacity-100" : "opacity-30")} /> REC {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}:{String(f).padStart(2, "0")}
      </div>
      <div className="absolute right-9 bottom-8 text-right">
        <p>ALT {altitude.toFixed(0)} M</p>
        <p className="text-white/45">{coords}</p>
      </div>
      <div className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 opacity-40">
        <span className="absolute top-1/2 left-0 h-px w-full bg-white" />
        <span className="absolute top-0 left-1/2 h-full w-px bg-white" />
      </div>
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/45">{place.toUpperCase()}</p>
    </div>
  );
}

/** A slow aerial push-in over an illustrated location, with the drone's read-outs on top. */
export function DroneShot({ t, variant, ms }: SceneProps & { variant: Variant; ms: number }) {
  const shot = shots[variant];
  const p = clamp(t / ms);
  // The camera drifts sideways and pushes in, the way a drone approaches a site.
  const zoom = 1.0 + p * 0.14;
  const pan = p * 260;
  const layer = (depth: number) => `translate(${-pan * depth} 0)`;

  return (
    <div className="border-glow relative h-full w-full overflow-hidden rounded-3xl bg-night shadow-[0_60px_140px_-40px_rgb(0_0_0)]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shot.sky[0]} />
            <stop offset="0.55" stopColor={shot.sky[1]} />
            <stop offset="1" stopColor={shot.sky[2]} />
          </linearGradient>
          <radialGradient id={`sun-${variant}`}>
            <stop offset="0" stopColor={shot.sun} stopOpacity="0.95" />
            <stop offset="0.35" stopColor={shot.sun} stopOpacity="0.35" />
            <stop offset="1" stopColor={shot.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d5f85" />
            <stop offset="1" stopColor="#06182b" />
          </linearGradient>
        </defs>
        <g transform={`translate(${W / 2} ${H * 0.8}) scale(${zoom}) translate(${-W / 2} ${-H * 0.8})`}>
          <rect x={-400} y={-200} width={W + 800} height={H + 400} fill={`url(#sky-${variant})`} />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={rnd(i * 2.1) * W} cy={rnd(i * 5.3) * 330} r={rnd(i * 8.7) * 1.5 + 0.4} fill="#fff" opacity={0.25 + rnd(i) * 0.5} />
          ))}
          <circle cx={variant === "city" ? 1180 : variant === "factory" ? 300 : 1250} cy={GROUND - (variant === "port" ? 170 : 120)} r={300} fill={`url(#sun-${variant})`} />
          {/* Clouds drift the other way to the camera */}
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={((i * 520 + 200 - t / 60) % (W + 600)) - 100} cy={150 + i * 46} rx={170 + i * 30} ry={20 + i * 4} fill="#fff" opacity={0.05} />
          ))}

          {variant === "city" && (
            <>
              <g transform={layer(0.25)}>
                <CityFar />
              </g>
              <g transform={layer(0.6)}>
                <CityMid />
              </g>
              <rect x={-400} y={GROUND} width={W + 800} height={300} fill="#0b0d22" />
              <g transform={layer(1.15)}>
                <CityNear />
              </g>
            </>
          )}

          {variant === "factory" && (
            <g transform={layer(0.7)}>
              <FactoryStatic />
              <Smoke x={487} y={GROUND - 424} t={t} />
              <Smoke x={577} y={GROUND - 394} t={t + 1400} />
              <Smoke x={947} y={GROUND - 364} t={t + 2600} drift={1.3} />
              {/* Boxes riding the conveyor out to the trucks */}
              {Array.from({ length: 6 }, (_, k) => {
                const phase = (t / 5200 + k / 6) % 1;
                return <rect key={k} x={790 + phase * 400} y={GROUND - 58} width={26} height={24} rx={3} fill="#d97706" stroke="#92400e" strokeWidth="2" />;
              })}
              <TruckShape x={1230} y={GROUND + 60} />
              <TruckShape x={-200 + ease(t / (ms * 0.9)) * 900} y={GROUND + 128} hue="#fde68a" />
            </g>
          )}

          {variant === "port" && (
            <>
              <g transform={layer(0.35)}>
                <PortStatic />
              </g>
              <rect x={-400} y={GROUND - 84} width={W + 800} height={400} fill="url(#sea)" />
              {Array.from({ length: 9 }, (_, i) => (
                <path key={i} d={`M-400 ${GROUND - 60 + i * 30} H${W + 400}`} stroke="#7dd3fc" strokeOpacity={0.1 + i * 0.012} strokeWidth={2} strokeDasharray={`${60 + i * 14} ${90 + i * 20}`} strokeDashoffset={(t / (26 - i * 2)) * (i % 2 ? 1 : -1)} />
              ))}
              {/* The ship pulls away from the quay */}
              <g transform={`translate(${60 + ease(t / ms) * 420} ${GROUND + 20 + Math.sin(t / 900) * 4}) rotate(${Math.sin(t / 1300) * 0.5})`}>
                <Smoke x={96} y={-200} t={t} drift={-1.6} tone="#e2e8f0" />
                <ShipShape />
                {Array.from({ length: 5 }, (_, i) => (
                  <path key={i} d={`M${-30 - i * 70} ${74 + (i % 2) * 6} q -30 -8 -60 0`} stroke="#e0f2fe" strokeWidth="3" fill="none" opacity={0.55 - i * 0.09} />
                ))}
              </g>
            </>
          )}
        </g>
        {/* Lens falloff */}
        <rect width={W} height={H} fill="url(#vignette)" />
        <defs>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
        </defs>
      </svg>

      <Hud place={shot.place} coords={shot.coords} t={t} altitude={148 - p * 46} />

      {shot.chips.map((c) => (
        <AnimatePresence key={c.text}>
          {t > c.at && (
            <motion.div className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${c.x}%`, top: `${c.y}%` }} initial={{ opacity: 0, y: 16, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              <span className="flex items-center gap-2 rounded-full border border-white/20 bg-night/85 px-3.5 py-2 text-xs font-medium whitespace-nowrap text-white backdrop-blur sm:text-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                {c.text}
              </span>
              <span className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-night/95 via-night/60 to-transparent px-12 pt-20 pb-28">
        <Place>{shot.place}</Place>
        <Line small>{shot.line}</Line>
        <Sub>{shot.sub}</Sub>
      </div>
    </div>
  );
}

// ---- An order on its way ----------------------------------------------------

const legs: { icon: LucideIcon; label: string; place: string; update: string }[] = [
  { icon: Factory, label: "Produced", place: "Pune plant", update: "Assembly team finished production and packed the order" },
  { icon: Ship, label: "Shipped", place: "Port of Mumbai", update: "Logistics team confirmed the consignment has sailed" },
  { icon: Truck, label: "Out for delivery", place: "Toronto depot", update: "Delivery team loaded the order for the last mile" },
  { icon: Home, label: "Delivered", place: "Client's store", update: "Order delivered and waiting for your sign-off" },
];

const card = "border-glow rounded-3xl bg-night-2 shadow-[0_60px_120px_-40px_rgb(0_0_0)]";

/** One order travelling from the plant to the customer, and the client's portal moving with it. */
export function Journey({ t, ms }: SceneProps & { ms: number }) {
  const p = clamp((t - 1200) / (ms - 4200));
  const reached = Math.min(legs.length - 1, Math.floor(p * (legs.length - 1) + 0.001));
  const stage = t < 1200 ? -1 : reached;
  const percent = Math.round(p * 100);

  return (
    <div className="flex h-full flex-col justify-center gap-10">
      <div className="max-w-3xl">
        <Place>Pune → Mumbai → Toronto</Place>
        <Line>The work travels. The client never loses sight of it.</Line>
      </div>

      {/* The route */}
      <div className="relative mx-6">
        <div className="absolute top-8 right-8 left-8 h-1 rounded-full bg-white/10" />
        <div className="absolute top-8 left-8 h-1 rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400" style={{ width: `calc((100% - 4rem) * ${p})` }} />
        <div className="absolute top-8 right-8 left-8">
          <div className="absolute -translate-x-1/2 -translate-y-[130%]" style={{ left: `${p * 100}%` }}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-400 text-night shadow-[0_10px_30px_-6px_rgb(251_191_36_/_0.9)]" style={{ transform: `translateY(${Math.sin(t / 220) * 3}px) rotate(${Math.sin(t / 300) * 5}deg)` }}>
              <Package className="size-6" />
            </span>
          </div>
        </div>
        <ol className="relative flex justify-between">
          {legs.map((l, i) => {
            const on = stage >= i;
            return (
              <li key={l.label} className="flex w-16 flex-col items-center text-center">
                <span className={clsx("flex size-16 items-center justify-center rounded-2xl ring-1 transition-all duration-500", on ? "bg-emerald-400 text-night ring-emerald-300 shadow-[0_0_40px_-6px_rgb(52_211_153_/_0.9)]" : "bg-night-2 text-white/40 ring-white/15")}>
                  <l.icon className="size-7" />
                </span>
                <span className={clsx("mt-3 text-sm font-semibold whitespace-nowrap transition-colors", on ? "text-white" : "text-white/40")}>{l.label}</span>
                <span className="text-xs whitespace-nowrap text-white/40">{l.place}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* What the client sees */}
      <motion.div className={clsx(card, "mx-auto grid w-full max-w-4xl gap-6 p-6 sm:grid-cols-[auto_1fr]")} style={{ transformPerspective: 1400 }} initial={{ opacity: 0, rotateX: 30, y: 60 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: easeOut }}>
        <div className="flex flex-col items-center justify-center px-4">
          <span className="text-5xl font-semibold tabular-nums">{percent}%</span>
          <span className="text-xs text-white/45">of the order complete</span>
        </div>
        <div>
          <p className="text-xs text-white/45">Client portal · live</p>
          <p className="text-lg font-semibold">Autumn range · first consignment</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-4 min-h-12">
            <AnimatePresence mode="wait">
              {stage >= 0 && (
                <motion.p key={stage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-white/85">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="size-3" />
                  </span>
                  {legs[stage].update}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Delivered, and a happy customer ----------------------------------------

/** The last mile: the truck arrives, the order is handed over and the customer signs off. */
export function Doorstep({ t }: SceneProps) {
  const arrive = ease(t / 3600);
  const truckX = -420 + arrive * 760;
  const handed = clamp((t - 4000) / 1500);
  const happy = t > 5600;
  const approved = t > 9200;
  const armLift = happy ? -62 : 0;

  return (
    <div className="border-glow relative h-full w-full overflow-hidden rounded-3xl bg-night shadow-[0_60px_140px_-40px_rgb(0_0_0)]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="evening" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1030" />
            <stop offset="0.6" stopColor="#3b2a63" />
            <stop offset="1" stopColor="#c2566b" />
          </linearGradient>
          <radialGradient id="lamp">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#evening)" />
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={rnd(i * 3.1) * W} cy={rnd(i * 6.7) * 300} r={rnd(i * 1.9) * 1.6 + 0.4} fill="#fff" opacity={0.5} />
        ))}
        {/* Street behind */}
        {street.map((b) => (
          <rect key={b.id} x={b.x} y={GROUND - 110 - b.h} width={b.w} height={b.h + 110} fill="#1a1740" />
        ))}

        {/* The client's shop */}
        <rect x={900} y={GROUND - 430} width={560} height={430} fill="#262a5e" />
        <rect x={900} y={GROUND - 430} width={560} height={26} fill="#34397a" />
        <path d={`M880 ${GROUND - 300} H1480 L1454 ${GROUND - 236} H906 Z`} fill="#10b981" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M${880 + i * 75} ${GROUND - 300} h37.5 l-3 64 h-31 Z`} fill="#f8fafc" opacity={0.9} />
        ))}
        <rect x={1180} y={GROUND - 216} width={230} height={150} rx={6} fill="#fde68a" opacity={0.9} />
        <rect x={1180} y={GROUND - 216} width={230} height={150} rx={6} fill="none" stroke="#1e1b4b" strokeWidth="8" />
        <path d={`M1295 ${GROUND - 216} V${GROUND - 66}`} stroke="#1e1b4b" strokeWidth="6" />
        <rect x={980} y={GROUND - 226} width={130} height={226} rx={6} fill="#1e1b4b" />
        <rect x={994} y={GROUND - 212} width={102} height={120} rx={4} fill="#fcd9a0" opacity={0.85} />
        <circle cx={1090} cy={GROUND - 100} r={6} fill="#fde68a" />
        <rect x={1140} y={GROUND - 396} width={250} height={56} rx={10} fill="#0b0b0f" />
        <text x={1265} y={GROUND - 358} textAnchor="middle" fontSize="30" fontWeight="700" fill="#34d399" fontFamily="var(--font-inter), sans-serif">
          OPEN
        </text>
        <circle cx={860} cy={GROUND - 330} r={150} fill="url(#lamp)" />
        <rect x={855} y={GROUND - 330} width={10} height={330} fill="#111133" />
        <circle cx={860} cy={GROUND - 336} r={14} fill="#fde68a" />

        {/* Pavement and road */}
        <rect y={GROUND} width={W} height={50} fill="#2a2752" />
        <rect y={GROUND + 50} width={W} height={H} fill="#12112b" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={i * 150 - ((t / 14) % 150)} y={GROUND + 120} width={80} height={6} fill="#f8fafc" opacity={arrive < 1 ? 0.4 : 0.25} />
        ))}

        {/* Delivery truck */}
        <g transform={`translate(${truckX} ${GROUND + 86 + (arrive < 1 ? Math.sin(t / 90) * 1.5 : 0)}) scale(1.7)`}>
          <TruckShape x={0} y={0} hue="#eef2ff" />
          <text x={75} y={-34} textAnchor="middle" fontSize="15" fontWeight="700" fill="#4f46e5" fontFamily="var(--font-inter), sans-serif">
            DELIVERY
          </text>
        </g>

        {/* The order, carried from the truck to the door */}
        {t > 3800 && (
          <g transform={`translate(${760 + handed * 190} ${GROUND - 20 - Math.sin(handed * Math.PI) * 70})`}>
            <rect x={-34} y={-58} width={68} height={58} rx={5} fill="#d97706" stroke="#92400e" strokeWidth="3" />
            <path d="M-34 -30 H34 M0 -58 V0" stroke="#92400e" strokeWidth="3" />
          </g>
        )}

        {/* The customer */}
        <g transform={`translate(1050 ${GROUND})`}>
          <rect x={-26} y={-78} width={22} height={78} rx={8} fill="#1e293b" />
          <rect x={4} y={-78} width={22} height={78} rx={8} fill="#1e293b" />
          <rect x={-36} y={-190} width={72} height={124} rx={22} fill="#6366f1" />
          <g transform={`translate(-30 -172) rotate(${-armLift - 14})`}>
            <rect x={-9} y={0} width={18} height={84} rx={9} fill="#6366f1" />
            <circle cx={0} cy={86} r={11} fill="#f2c9a5" />
          </g>
          <g transform={`translate(30 -172) rotate(${armLift + 14})`}>
            <rect x={-9} y={0} width={18} height={84} rx={9} fill="#6366f1" />
            <circle cx={0} cy={86} r={11} fill="#f2c9a5" />
          </g>
          <g transform={`translate(0 ${happy ? -Math.abs(Math.sin(t / 260)) * 14 : 0})`}>
            <circle cx={0} cy={-226} r={38} fill="#f2c9a5" />
            <path d="M-38 -236 Q-34 -276 0 -272 Q36 -276 38 -236 Q20 -252 0 -250 Q-20 -252 -38 -236 Z" fill="#1f1235" />
            <circle cx={-13} cy={-230} r={4} fill="#1f1235" />
            <circle cx={13} cy={-230} r={4} fill="#1f1235" />
            <path d={happy ? "M-16 -212 Q0 -192 16 -212" : "M-10 -210 Q0 -206 10 -210"} stroke="#1f1235" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Confetti when the order arrives */}
        {happy &&
          Array.from({ length: 46 }, (_, i) => {
            const life = clamp((t - 5600) / 2600);
            const angle = rnd(i * 4.9) * Math.PI * 2;
            const speed = 120 + rnd(i * 7.7) * 320;
            return <rect key={i} x={1050 + Math.cos(angle) * speed * life} y={GROUND - 300 + Math.sin(angle) * speed * life + life * life * 320} width={10} height={16} rx={2} fill={containerHues[i % containerHues.length]} opacity={1 - life} transform={`rotate(${i * 40 + life * 400} ${1050 + Math.cos(angle) * speed * life} ${GROUND - 300 + Math.sin(angle) * speed * life + life * life * 320})`} />;
          })}
      </svg>

      {/* What the customer's phone says */}
      <AnimatePresence>
        {t > 6400 && (
          <motion.div className="absolute top-[42%] left-[6%] w-[24rem] max-w-[80%]" initial={{ opacity: 0, x: -60, rotateY: 30 }} animate={{ opacity: 1, x: 0, rotateY: 8 }} transition={{ type: "spring", stiffness: 160, damping: 20 }} style={{ transformPerspective: 1000 }}>
            <div className={clsx(card, "p-5")}>
              <p className="text-xs text-white/45">Client portal · just now</p>
              <p className="mt-1 text-lg font-semibold">Your order has been delivered</p>
              <p className="mt-1 text-sm text-white/55">All four milestones are complete. Approve the delivery to close the project.</p>
              <div className="mt-4">
                <AnimatePresence mode="wait">
                  {approved ? (
                    <motion.p key="done" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-night">
                      <Check className="size-4" /> Approved. Project delivered.
                    </motion.p>
                  ) : (
                    <motion.p key="ask" exit={{ opacity: 0, scale: 0.9 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-night">
                      <ThumbsUp className="size-4" /> Approve delivery
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-night/95 via-night/60 to-transparent px-12 pt-12 pb-28">
        <Place>Toronto · the client&apos;s store</Place>
        <Line small>Delivered. And the customer saw it coming.</Line>
        <Sub>No calls asking where the order is. The portal said so at every step, and the last step is theirs.</Sub>
      </div>
    </div>
  );
}

// ---- The client's portal ----------------------------------------------------

const portalProjects = [
  { name: "Autumn range · first consignment", company: "Kaveri Manufacturing", team: "Assembly team", target: 100, hue: "#34d399" },
  { name: "Ordering app", company: "Kaveri Labs", team: "Mobile team", target: 72, hue: "#818cf8" },
  { name: "Store website refresh", company: "Northwind Studio", team: "Web team", target: 38, hue: "#38bdf8" },
];
const portalUpdates = [
  "Assembly team finished production and packed the order",
  "Mobile team moved Checkout to review",
  "Logistics team confirmed the consignment has sailed",
  "Web team submitted Design for your approval",
  "You approved the delivery. Project complete.",
];

/** Everything the client has in flight, on one screen. */
export function Portal({ t }: SceneProps) {
  const fill = ease((t - 900) / 3200);
  const shownUpdates = Math.floor((t - 1800) / 1500);
  const r = 34;
  return (
    <div className="grid h-full items-center gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
      <div>
        <Place>The client&apos;s screen</Place>
        <Line>Every project, every team, every update. One page.</Line>
        <Sub>Whichever company is doing the work, the client opens one portal and sees where everything stands.</Sub>
      </div>
      <motion.div className={clsx(card, "overflow-hidden")} style={{ transformPerspective: 1600 }} initial={{ opacity: 0, rotateY: -26, rotateX: 10, scale: 0.84, x: 80 }} animate={{ opacity: 1, rotateY: -5, rotateX: 2, scale: 1, x: 0 }} transition={{ duration: 1.1, delay: 0.2, ease: easeOut }}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <span className="size-3 rounded-full bg-rose-400/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 flex-1 rounded-full bg-white/[0.06] px-4 py-1 text-xs text-white/45">worknest · client portal</span>
        </div>
        <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-2xl font-semibold tracking-tight">Good evening, Maya.</p>
            <p className="text-sm text-white/45">Here is where every project stands.</p>
            <ul className="mt-5 space-y-3">
              {portalProjects.map((pr, i) => {
                const value = Math.round(pr.target * fill);
                return (
                  <motion.li key={pr.name} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.18, duration: 0.6, ease: easeOut }} className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-3.5">
                    <span className="relative size-20 shrink-0">
                      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="7" />
                        <circle cx="40" cy="40" r={r} fill="none" stroke={pr.hue} strokeWidth="7" strokeLinecap="round" strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - value / 100)} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums">{value}%</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{pr.name}</span>
                      <span className="block truncate text-xs text-white/45">{pr.company}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/70">
                        <span className="size-1.5 rounded-full" style={{ background: pr.hue }} /> {pr.team}
                      </span>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="flex items-center justify-between text-sm font-semibold">
              Latest updates
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            </p>
            <ul className="mt-3 space-y-2">
              <AnimatePresence initial={false}>
                {portalUpdates
                  .slice(0, clamp(shownUpdates, 0, portalUpdates.length))
                  .reverse()
                  .map((u) => (
                    <motion.li key={u} layout initial={{ opacity: 0, y: -18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs text-white/75 sm:text-sm">
                      {u}
                    </motion.li>
                  ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
