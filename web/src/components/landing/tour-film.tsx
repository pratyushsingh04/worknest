"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw, Search, ThumbsUp, X } from "lucide-react";
import { clsx } from "clsx";
import { GeoMap } from "@/components/landing/geo-map";
import { Globe } from "@/components/landing/globe";
import { LogoMark } from "@/components/logo";
import { easeOut } from "@/components/motion";

// A short film about a working day on WorkNest, drawn live in the browser.
// Each scene is a pure function of `t` (milliseconds since it began), so it can be paused and scrubbed.

const SCENE_MS = 7500;

interface SceneProps {
  t: number;
}

const cities = [
  { name: "Bengaluru", x: 68, y: 58 },
  { name: "Berlin", x: 50, y: 22 },
  { name: "Toronto", x: 16, y: 30 },
  { name: "São Paulo", x: 24, y: 76 },
  { name: "Lagos", x: 44, y: 64 },
  { name: "Dubai", x: 62, y: 40 },
  { name: "Tokyo", x: 88, y: 34 },
  { name: "Sydney", x: 86, y: 78 },
];

function Place({ children }: { children: string }) {
  return (
    <motion.p className="flex items-center gap-2 text-sm font-medium tracking-[0.2em] text-emerald-300 uppercase" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
      <MapPin className="size-4" /> {children}
    </motion.p>
  );
}

function Line({ children, delay = 0.15 }: { children: string; delay?: number }) {
  return (
    <h2 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
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

function Sub({ children }: { children: string }) {
  return (
    <motion.p className="mt-4 max-w-lg text-base text-white/60 sm:text-lg" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7, ease: easeOut }}>
      {children}
    </motion.p>
  );
}

/** Two-column scene: words on the left, the product on the right, swinging in. */
function Stage({ copy, children }: { copy: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid h-full items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div>{copy}</div>
      <motion.div style={{ transformPerspective: 1500 }} initial={{ opacity: 0, rotateY: -24, rotateX: 8, scale: 0.86, x: 60 }} animate={{ opacity: 1, rotateY: -6, rotateX: 2, scale: 1, x: 0 }} transition={{ duration: 1.1, delay: 0.2, ease: easeOut }}>
        {children}
      </motion.div>
    </div>
  );
}

const card = "border-glow rounded-3xl bg-night-2 shadow-[0_60px_120px_-40px_rgb(0_0_0)]";

function World({ t }: SceneProps) {
  const shown = Math.floor(t / 520);
  return (
    <div className="relative flex h-full flex-col items-center justify-center text-center">
      <div className="relative w-[min(78vh,92vw)]">
        <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 1.6, ease: easeOut }}>
          <Globe className="w-full" />
        </motion.div>
        {cities.map((c, i) => (
          <AnimatePresence key={c.name}>
            {i < shown && (
              <motion.span
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-night/80 px-2.5 py-1 text-xs whitespace-nowrap backdrop-blur"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                initial={{ opacity: 0, scale: 0.4, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                {c.name}
              </motion.span>
            )}
          </AnimatePresence>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-night via-night/80 to-transparent pt-24 pb-2">
        <Line>One working day. Every time zone.</Line>
        <Sub>Wherever a company is, its people, teams, delivery and clients move through the same living system.</Sub>
      </div>
    </div>
  );
}

function Morning({ t }: SceneProps) {
  const chips = [
    { at: 1600, text: "Check-in verified · inside the office radius" },
    { at: 3200, text: "Marked on time for 09:58" },
    { at: 4800, text: "Leave request approved by the manager" },
  ];
  return (
    <Stage
      copy={
        <>
          <Place>Bengaluru · 09:58</Place>
          <Line>The day starts with a check-in that proves itself.</Line>
          <Sub>Location-verified attendance, leave and policies run on their own, so nobody keeps a register.</Sub>
        </>
      }
    >
      <div className={clsx(card, "p-4")}>
        <GeoMap />
        <ul className="mt-3 space-y-2">
          {chips.map((c) => (
            <AnimatePresence key={c.text}>
              {t > c.at && (
                <motion.li initial={{ opacity: 0, x: 30, height: 0 }} animate={{ opacity: 1, x: 0, height: "auto" }} className="flex items-center gap-2.5 overflow-hidden rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-white/80">
                  <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="size-3" />
                  </span>
                  {c.text}
                </motion.li>
              )}
            </AnimatePresence>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

const columns = ["To do", "In progress", "Done"];
const tasks = [
  { title: "Checkout screen", who: "bg-indigo-400", moves: [900, 3300] },
  { title: "Payment gateway", who: "bg-amber-400", moves: [1900, 4700] },
  { title: "Order tracking", who: "bg-rose-400", moves: [2700, 99999] },
  { title: "Delivery slots", who: "bg-sky-400", moves: [5600, 99999] },
];

function Delivery({ t }: SceneProps) {
  const where = (task: (typeof tasks)[number]) => (t > task.moves[1] ? 2 : t > task.moves[0] ? 1 : 0);
  const done = tasks.filter((x) => where(x) === 2).length;
  const percent = 35 + done * 20 + tasks.filter((x) => where(x) === 1).length * 6;
  return (
    <Stage
      copy={
        <>
          <Place>Berlin · 11:20</Place>
          <Line>A team ships work, and the board keeps itself current.</Line>
          <Sub>Leads assign tasks, cards move as people finish them and progress recalculates for everyone watching.</Sub>
        </>
      }
    >
      <div className={clsx(card, "p-5")}>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Storefront rebuild</p>
          <span className="text-2xl font-semibold tabular-nums">{percent}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-indigo-400" animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {columns.map((col, ci) => (
            <div key={col} className="min-h-52 rounded-2xl bg-white/[0.03] p-2.5">
              <p className="mb-2 px-1 text-xs font-medium text-white/45">{col}</p>
              <div className="space-y-2">
                {tasks
                  .filter((x) => where(x) === ci)
                  .map((x) => (
                    <motion.div key={x.title} layoutId={`film-${x.title}`} transition={{ type: "spring", stiffness: 260, damping: 26 }} className={clsx("rounded-xl border px-3 py-2.5 text-xs sm:text-sm", ci === 2 ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-night")}>
                      <p className={clsx(ci === 2 && "text-white/60 line-through")}>{x.title}</p>
                      <span className={clsx("mt-2 block size-4 rounded-full", x.who)} />
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

const query = "mobile app for a restaurant chain";
const results = [
  { name: "Northwind Studio", place: "Berlin, Germany", tags: ["Mobile apps", "E-commerce"], hue: "from-sky-400 to-indigo-600" },
  { name: "Kaveri Labs", place: "Bengaluru, India", tags: ["Product engineering", "Mobile apps"], hue: "from-emerald-400 to-teal-600" },
  { name: "Atlântica Digital", place: "São Paulo, Brazil", tags: ["Design", "Web apps"], hue: "from-amber-300 to-orange-600" },
];

function Discover({ t }: SceneProps) {
  const typed = query.slice(0, Math.max(0, Math.floor((t - 500) / 55)));
  const searched = t > 500 + query.length * 55 + 300;
  const picked = t > 5200;
  const sent = t > 6300;
  return (
    <Stage
      copy={
        <>
          <Place>Toronto · 14:05</Place>
          <Line>A client finds the right company, with proof.</Line>
          <Sub>Every listed company shows what it does, its teams and people, and a delivery record nobody can edit.</Sub>
        </>
      }
    >
      <div className={clsx(card, "p-5")}>
        <div className="flex h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm">
          <Search className="size-4 text-white/40" />
          <span>{typed}</span>
          <motion.span className="h-4 w-px bg-emerald-300" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        </div>
        <div className="mt-4 space-y-3">
          {results.map((r, i) => (
            <AnimatePresence key={r.name}>
              {searched && (
                <motion.div
                  style={{ transformPerspective: 900 }}
                  initial={{ opacity: 0, rotateX: -70, y: 20 }}
                  animate={{ opacity: picked && i !== 1 ? 0.35 : 1, rotateX: 0, y: 0, scale: picked && i === 1 ? 1.03 : 1 }}
                  transition={{ duration: 0.6, delay: picked ? 0 : i * 0.14, ease: easeOut }}
                  className={clsx("flex items-center gap-4 rounded-2xl border p-4", picked && i === 1 ? "border-emerald-400/50 bg-emerald-400/[0.07]" : "border-white/10 bg-white/[0.03]")}
                >
                  <span className={clsx("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-semibold", r.hue)}>{r.name.split(" ").map((w) => w[0]).join("")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-white/45">{r.place}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/65">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {i === 1 && sent && (
                    <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 16 }} className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-night">
                      <Check className="size-3.5" /> Request sent
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>
    </Stage>
  );
}

const milestones = ["Design", "Core build", "Ordering flow", "Launch"];

function SignOff({ t }: SceneProps) {
  const percent = Math.min(100, Math.round(30 + (t / 5600) * 70));
  const approved = Math.min(milestones.length, Math.floor(t / 1400));
  const done = percent >= 100;
  const r = 62;
  return (
    <Stage
      copy={
        <>
          <Place>Toronto · three weeks later</Place>
          <Line>The client watches it happen, and signs off.</Line>
          <Sub>Live progress, the team on the project, every update, and a milestone that is finished only when the client approves it.</Sub>
        </>
      }
    >
      <div className={clsx(card, "flex flex-col gap-6 p-6 sm:flex-row sm:items-center")}>
        <div className="relative mx-auto size-40 shrink-0">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={done ? "#34d399" : "#818cf8"} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - percent / 100)} style={{ transition: "stroke 0.4s" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-semibold tabular-nums">{percent}%</span>
            <span className="text-xs text-white/45">{done ? "delivered" : "complete"}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-white/45">Kaveri Labs · Mobile team</p>
          <p className="text-lg font-semibold">Ordering app</p>
          <ul className="mt-4 space-y-2">
            {milestones.map((m, i) => {
              const ok = i < approved;
              const waiting = i === approved;
              return (
                <li key={m} className={clsx("flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-300", waiting ? "bg-amber-400/10" : "bg-white/[0.04]")}>
                  <span className="flex items-center gap-2.5">
                    <span className={clsx("flex size-5 items-center justify-center rounded-full transition-colors", ok ? "bg-emerald-500" : waiting ? "bg-amber-400" : "border border-white/25")}>{ok && <Check className="size-3" />}</span>
                    {m}
                  </span>
                  <span className={clsx("text-xs", ok ? "text-emerald-300" : waiting ? "text-amber-300" : "text-white/35")}>{ok ? "Approved" : waiting ? "Awaiting approval" : "Upcoming"}</span>
                </li>
              );
            })}
          </ul>
          <AnimatePresence>
            {done && (
              <motion.p initial={{ opacity: 0, scale: 0.7, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-night">
                <ThumbsUp className="size-4" /> Signed off by the client
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Stage>
  );
}

function Outro({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div initial={{ rotateY: -360, scale: 0.3, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: 1.3, ease: easeOut }} style={{ transformPerspective: 800 }}>
        <LogoMark className="size-24 !rounded-[1.75rem]" />
      </motion.div>
      <Line delay={0.5}>Your company, in sync. Your clients, in the loop.</Line>
      <Sub>Register your company and it appears in the directory. Or join as a client and start with the companies already here.</Sub>
      <motion.div className={clsx("mt-9 flex flex-wrap justify-center gap-3", bare && "pointer-events-none")} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.6 }}>
        <Link href="/register" onClick={onClose} className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-night">
          Register your company <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link href="/register/client" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-7 py-4 text-sm font-semibold text-night">
          Join as a client
        </Link>
      </motion.div>
    </div>
  );
}

const scenes = [
  { label: "The world", glow: "rgb(79 70 229 / 0.35)" },
  { label: "Morning", glow: "rgb(16 185 129 / 0.28)" },
  { label: "Delivery", glow: "rgb(99 102 241 / 0.32)" },
  { label: "A client arrives", glow: "rgb(16 185 129 / 0.3)" },
  { label: "Sign-off", glow: "rgb(245 158 11 / 0.22)" },
  { label: "Your turn", glow: "rgb(79 70 229 / 0.4)" },
];

/**
 * The film itself. `bare` drops the player controls and leaves only the picture,
 * which is how the video file in /public is recorded (see scripts/record-tour.mjs).
 */
export function Film({ onClose, bare = false }: { onClose: () => void; bare?: boolean }) {
  // Which scene is showing and how far into it we are, kept together so the clock can roll one into the next.
  const [{ index, t }, setClock] = useState({ index: 0, t: 0 });
  const [playing, setPlaying] = useState(true);
  const last = scenes.length - 1;
  const lastTick = useRef(0);

  const go = useCallback((to: number) => setClock({ index: Math.max(0, Math.min(scenes.length - 1, to)), t: 0 }), []);

  // The clock. Scenes read `t`, so pausing freezes the whole picture.
  useEffect(() => {
    if (!playing) return;
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      // Move on when a scene has played out. The last one holds on its call to action.
      setClock((c) => {
        if (c.index === scenes.length - 1 && c.t >= SCENE_MS) return c;
        const next = c.t + Math.min(delta, 250);
        return next >= SCENE_MS && c.index < scenes.length - 1 ? { index: c.index + 1, t: 0 } : { index: c.index, t: next };
      });
    }, 50);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [index, go, onClose]);

  const ended = index === last;

  return (
    <motion.div role="dialog" aria-modal="true" aria-label="WorkNest tour" className="fixed inset-0 z-[90] flex flex-col bg-night text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute top-1/2 left-1/2 size-[110vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" animate={{ background: `radial-gradient(circle, ${scenes[index].glow}, transparent 55%)` }} transition={{ duration: 1.2 }} />
        <div className="absolute inset-0 bg-grid" />
      </div>

      {bare && (
        <div className="relative flex items-center justify-between px-10 pt-7">
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <LogoMark /> WorkNest
          </span>
          <span className="text-sm text-white/45">{scenes[index].label}</span>
        </div>
      )}

      {/* Chapters */}
      <div className={clsx("relative flex items-center gap-4 px-4 pt-4 sm:px-8", bare && "hidden")}>
        <div className="flex flex-1 gap-1.5">
          {scenes.map((s, i) => (
            <button key={s.label} onClick={() => go(i)} className="group flex-1 py-2" aria-label={`Go to ${s.label}`}>
              <span className="block h-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-white" style={{ width: `${i < index ? 100 : i === index ? (ended ? 100 : Math.min(100, (t / SCENE_MS) * 100)) : 0}%` }} />
              </span>
              <span className={clsx("mt-1.5 hidden text-left text-[11px] transition-colors sm:block", i === index ? "text-white" : "text-white/35 group-hover:text-white/70")}>{s.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close tour">
          <X className="size-5" />
        </button>
      </div>

      {/* Picture */}
      <div className="relative min-h-0 flex-1 overflow-hidden px-5 py-6 sm:px-12 lg:px-20" style={{ perspective: 1800 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="mx-auto h-full max-w-[1500px]"
            initial={{ opacity: 0, rotateY: 35, scale: 0.86, filter: "blur(10px)" }}
            animate={{ opacity: 1, rotateY: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, rotateY: -35, scale: 0.86, filter: "blur(10px)" }}
            transition={{ duration: 0.55, ease: easeOut }}
          >
            {index === 0 && <World t={t} />}
            {index === 1 && <Morning t={t} />}
            {index === 2 && <Delivery t={t} />}
            {index === 3 && <Discover t={t} />}
            {index === 4 && <SignOff t={t} />}
            {index === 5 && <Outro onClose={onClose} bare={bare} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {bare && <p className="relative px-10 pb-6 text-xs text-white/35">An illustration of how WorkNest works. The companies, people and places shown are examples.</p>}

      {/* Controls */}
      <div className={clsx("relative flex items-center justify-between gap-4 px-4 pb-5 sm:px-8", bare && "hidden")}>
        <p className="hidden max-w-sm text-xs text-white/35 sm:block">An illustration of how WorkNest works. The companies, people and places shown are examples.</p>
        <div className="mx-auto flex items-center gap-2 sm:mx-0">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30" aria-label="Previous scene">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => (ended ? go(0) : setPlaying((p) => !p))} className="flex size-12 items-center justify-center rounded-full bg-white text-night transition-transform hover:scale-105" aria-label={ended ? "Play again" : playing ? "Pause" : "Play"}>
            {ended ? <RotateCcw className="size-5" /> : playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
          <button onClick={() => go(index + 1)} disabled={ended} className="rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30" aria-label="Next scene">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <p className="hidden text-xs text-white/35 tabular-nums sm:block">
          {index + 1} / {scenes.length} · Space to pause, arrows to move
        </p>
      </div>
    </motion.div>
  );
}

/** Plays the recorded tour video full screen. Mounts only while open, so it always starts from the beginning. */
export function TourFilm({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{open && <VideoPlayer onClose={onClose} />}</AnimatePresence>, document.body);
}

function VideoPlayer({ onClose }: { onClose: () => void }) {
  const [ended, setEnded] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <motion.div role="dialog" aria-modal="true" aria-label="WorkNest tour video" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-8" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.div
        className="border-glow relative w-full max-w-[1400px] overflow-hidden rounded-2xl bg-night shadow-[0_60px_160px_-30px_rgb(79_70_229_/_0.6)] sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ transformPerspective: 1600 }}
        initial={{ opacity: 0, scale: 0.7, rotateX: 28, y: 80 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, rotateX: 12, y: 40 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
      >
        <video
          ref={video}
          src="/tour.webm"
          className="block aspect-video w-full bg-night"
          autoPlay
          playsInline
          controls
          onEnded={() => setEnded(true)}
          onPlay={() => setEnded(false)}
          aria-label="A day on WorkNest: check-in in Bengaluru, delivery in Berlin, a client in Toronto finding a company and signing off the work"
        />
        <button onClick={onClose} className="absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white/80 backdrop-blur transition-colors hover:bg-black/70 hover:text-white" aria-label="Close video">
          <X className="size-5" />
        </button>
        <AnimatePresence>
          {ended && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-night/85 text-white backdrop-blur-sm">
              <p className="text-2xl font-semibold tracking-tight sm:text-4xl">Ready when you are.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/register" onClick={onClose} className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-night">
                  Register your company <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/register/client" onClick={onClose} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-night">
                  Join as a client
                </Link>
                <button
                  onClick={() => {
                    setEnded(false);
                    video.current?.play();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold"
                >
                  <RotateCcw className="size-4" /> Watch again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
