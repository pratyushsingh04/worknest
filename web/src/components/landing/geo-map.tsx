"use client";

import { motion, useReducedMotion } from "motion/react";
import { Building2, MapPin, ShieldAlert } from "lucide-react";

const W = 400;
const H = 250;
const OFFICE = { x: 232, y: 124 };
const RADIUS = 64;
const LOOP = 9; // seconds for one full story

// Each person walks a few road segments. `inside` marks the keyframe from which
// they are within the office radius (and so turn from amber to green).
const people = [
  { path: [[28, 44], [150, 44], [150, 110], [206, 116]], inside: 3, delay: 0 },
  { path: [[384, 226], [300, 226], [300, 160], [258, 142]], inside: 3, delay: 0.8 },
  { path: [[232, 14], [232, 60], [232, 92]], inside: 2, delay: 1.6 },
  // Stops short of the geofence: check-in is refused.
  { path: [[20, 216], [70, 216], [112, 204]], inside: -1, delay: 0.4 },
];

const roadsH = [44, 110, 160, 216];
const roadsV = [70, 150, 232, 300, 356];

/**
 * A stylised city map telling the geofence story: people walk toward the office,
 * the ones who enter the radius are verified, the one outside is blocked.
 */
export function GeoMap({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const loop = (delay = 0) => (reduced ? { duration: 0 } : { duration: LOOP, delay, repeat: Infinity, ease: "easeInOut" as const });

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e14] ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Map showing employees checking in inside the office geofence">
        {/* City blocks */}
        {roadsH.slice(0, -1).map((y, r) =>
          roadsV.slice(0, -1).map((x, c) => (
            <rect key={`${r}-${c}`} x={x + 6} y={y + 6} width={roadsV[c + 1] - x - 12} height={roadsH[r + 1] - y - 12} rx="5" fill="rgb(255 255 255 / 0.025)" />
          )),
        )}
        {/* Park and river */}
        <rect x="76" y="116" width="68" height="38" rx="8" fill="rgb(52 211 153 / 0.10)" />
        <path d="M0 176 C 70 150, 110 200, 190 186 S 330 150, 400 190" fill="none" stroke="rgb(56 189 248 / 0.16)" strokeWidth="14" strokeLinecap="round" />
        {/* Roads */}
        {roadsH.map((y) => (
          <line key={`h${y}`} x1="0" x2={W} y1={y} y2={y} stroke="rgb(255 255 255 / 0.07)" strokeWidth="5" />
        ))}
        {roadsV.map((x) => (
          <line key={`v${x}`} y1="0" y2={H} x1={x} x2={x} stroke="rgb(255 255 255 / 0.07)" strokeWidth="5" />
        ))}
        <line x1="150" y1="110" x2="300" y2="160" stroke="rgb(255 255 255 / 0.07)" strokeWidth="5" />

        {/* Geofence */}
        <circle cx={OFFICE.x} cy={OFFICE.y} r={RADIUS} fill="rgb(99 102 241 / 0.10)" />
        <motion.circle
          cx={OFFICE.x}
          cy={OFFICE.y}
          r={RADIUS}
          fill="none"
          stroke="#818cf8"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          animate={reduced ? undefined : { strokeDashoffset: [0, -44] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        {!reduced && (
          <motion.circle cx={OFFICE.x} cy={OFFICE.y} r={10} fill="none" stroke="#818cf8" strokeWidth="1" animate={{ r: [10, RADIUS], opacity: [0.7, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} />
        )}
        <text x={OFFICE.x + RADIUS - 6} y={OFFICE.y - RADIUS + 14} fontSize="8" fill="rgb(165 180 252 / 0.8)" textAnchor="end">
          200 m radius
        </text>

        {/* People */}
        {people.map((p, i) => {
          const n = p.path.length;
          // Walk during the first half of the loop, then hold at the destination.
          const times = [...p.path.map((_, k) => (k / (n - 1)) * 0.5), 1];
          const xs = [...p.path.map((pt) => pt[0]), p.path[n - 1][0]];
          const ys = [...p.path.map((pt) => pt[1]), p.path[n - 1][1]];
          const fills = [...p.path.map((_, k) => (p.inside >= 0 && k >= p.inside ? "#34d399" : "#fbbf24")), p.inside >= 0 ? "#34d399" : "#fbbf24"];
          const end = p.path[n - 1];
          return (
            <g key={i}>
              <motion.circle
                r="5"
                stroke="#0d0e14"
                strokeWidth="2"
                initial={{ cx: reduced ? end[0] : xs[0], cy: reduced ? end[1] : ys[0], fill: reduced ? fills[n - 1] : fills[0] }}
                animate={reduced ? undefined : { cx: xs, cy: ys, fill: fills }}
                transition={{ ...loop(p.delay), times }}
              />
              {p.inside >= 0 && !reduced && (
                <motion.circle cx={end[0]} cy={end[1]} r={5} fill="none" stroke="#34d399" strokeWidth="1.5" animate={{ r: [5, 5, 16, 16], opacity: [0, 0.9, 0, 0] }} transition={{ ...loop(p.delay), times: [0, 0.5, 0.62, 1] }} />
              )}
            </g>
          );
        })}

        {/* Office */}
        <circle cx={OFFICE.x} cy={OFFICE.y} r="13" fill="#4f46e5" stroke="#0d0e14" strokeWidth="3" />
      </svg>

      {/* Office icon sits over the pin (crisper as HTML than as scaled SVG). */}
      <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-white" style={{ left: `${(OFFICE.x / W) * 100}%`, top: `${(OFFICE.y / H) * 100}%` }}>
        <Building2 className="size-3.5" />
      </span>

      {/* Outcome chips */}
      <motion.div
        className="absolute flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-night/90 px-2 py-1 text-[10px] font-medium whitespace-nowrap text-emerald-300 shadow-lg backdrop-blur"
        style={{ left: "4%", top: "6%" }}
        animate={reduced ? undefined : { opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, -4] }}
        transition={{ ...loop(), times: [0, 0.5, 0.58, 0.92, 1] }}
      >
        <MapPin className="size-3" /> Check-in verified · 42 m from office
      </motion.div>
      <motion.div
        className="absolute flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-night/90 px-2 py-1 text-[10px] font-medium whitespace-nowrap text-amber-300 shadow-lg backdrop-blur"
        style={{ left: "4%", bottom: "6%" }}
        animate={reduced ? undefined : { opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, -4] }}
        transition={{ ...loop(), times: [0, 0.56, 0.64, 0.92, 1] }}
      >
        <ShieldAlert className="size-3" /> 310 m away · check-in blocked
      </motion.div>
    </div>
  );
}
