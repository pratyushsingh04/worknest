"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { easeOut } from "@/components/motion";

const NAME = "WorkNest";
const SIZE = 96;

interface Target {
  x: number;
  y: number;
  scale: number;
}

/** Where the navbar logo sits, so the intro logo can fly to exactly that spot. */
function navLogoTarget(): Target | null {
  const el = document.querySelector<HTMLElement>("#nav-logo span");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - window.innerHeight / 2, scale: r.width / SIZE };
}

/**
 * Opening sequence: the logo appears large in the centre, the name rises letter by
 * letter, then the curtain parts while the logo flies up into its place in the navbar.
 * Click anywhere to skip. Skipped entirely for reduced-motion users.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  // "pending" renders a plain dark screen on the server and first client paint, so hydration matches.
  const [phase, setPhase] = useState<"pending" | "playing" | "leaving" | "gone">("pending");
  const [target, setTarget] = useState<Target | null>(null);

  const finish = useCallback(() => {
    document.documentElement.style.overflow = "";
    setPhase("gone");
    onDone();
  }, [onDone]);

  const leave = useCallback(() => {
    setTarget(navLogoTarget());
    setPhase((p) => (p === "playing" ? "leaving" : p));
    // The flight and the curtain both take 0.9s; hand over to the page just after.
    setTimeout(finish, 1000);
  }, [finish]);

  useEffect(() => {
    const play = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (play) document.documentElement.style.overflow = "hidden";
    const start = setTimeout(() => (play ? setPhase("playing") : finish()), 0);
    const end = play ? setTimeout(leave, 2300) : undefined;
    return () => {
      clearTimeout(start);
      if (end) clearTimeout(end);
    };
  }, [finish, leave]);

  if (phase === "gone") return null;
  const leaving = phase === "leaving";
  const curtain = { duration: 0.9, ease: [0.76, 0, 0.24, 1] as const };

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => phase === "playing" && leave()} role="presentation">
      <motion.div className="absolute inset-x-0 top-0 h-1/2 bg-night" animate={{ y: leaving ? "-100%" : 0 }} transition={curtain} />
      <motion.div className="absolute inset-x-0 bottom-0 h-1/2 bg-night" animate={{ y: leaving ? "100%" : 0 }} transition={curtain} />

      {phase !== "pending" && (
        <>
          {/* The logo: pops in at the centre, then travels to the navbar. */}
          <div className="pointer-events-none absolute top-1/2 left-1/2" style={{ marginLeft: -SIZE / 2, marginTop: -SIZE / 2 - 60 }}>
            <motion.div
              className="flex items-center justify-center rounded-[1.75rem] bg-brand-gradient shadow-[0_30px_80px_-20px_rgb(79_70_229_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.3)]"
              style={{ width: SIZE, height: SIZE, transformPerspective: 800 }}
              initial={{ scale: 0.4, rotateY: -360, opacity: 0, x: 0, y: 0 }}
              animate={leaving && target ? { x: target.x, y: target.y + 60, scale: target.scale, rotateY: 0, opacity: 1 } : { scale: 1, rotateY: 0, opacity: 1, x: 0, y: 0 }}
              transition={leaving ? { duration: 0.9, ease: [0.76, 0, 0.24, 1] } : { duration: 1.1, ease: [0.16, 1, 0.3, 1], opacity: { duration: 0.25 } }}
            >
              <svg viewBox="0 0 24 24" style={{ width: SIZE * 0.58, height: SIZE * 0.58 }} fill="none" aria-hidden>
                <path d="M3.5 6.5 7.2 18l4.8-9 4.8 9 3.7-11.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>

          <AnimatePresence>
            {!leaving && (
              <motion.div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
                <div className="absolute h-[420px] w-[420px] -translate-y-[60px] bg-[radial-gradient(circle,rgb(99_102_241_/_0.3),transparent_65%)]" />
                <div style={{ height: SIZE, marginTop: -60 }} />
                <h1 className="mt-8 flex overflow-hidden text-5xl font-semibold tracking-tight text-white sm:text-6xl" aria-label={NAME}>
                  {NAME.split("").map((ch, i) => (
                    <motion.span key={i} initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.6 + i * 0.05, ease: easeOut }} className="inline-block" aria-hidden>
                      {ch}
                    </motion.span>
                  ))}
                </h1>
                <motion.p className="mt-3 text-sm tracking-[0.3em] text-white/45 uppercase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }}>
                  Your company, in sync
                </motion.p>
                <div className="mt-10 h-px w-48 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full bg-indigo-400" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.1, ease: "easeInOut" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
