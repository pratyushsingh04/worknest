"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { Check, MessageSquare, ThumbsUp } from "lucide-react";
import { clsx } from "clsx";
import { easeOut } from "@/components/motion";

const milestones = ["Discovery & design", "Core build", "Checkout flow", "Launch"];

const chapters = [
  { title: "Work begins, and you can see it.", text: "The moment the team starts, your project appears in your portal with its milestones laid out in order." },
  { title: "Progress moves on its own.", text: "Every task the team completes pushes the percentage forward. Nobody prepares a status report for you." },
  { title: "Nothing is done until you approve.", text: "When a milestone is ready, it waits for you. Approve it, or send it back with a note." },
  { title: "Delivered, with a record of it.", text: "The finished project joins the company's track record, and you can request the next one from any team." },
];

const updates = [
  "Web Engineering team started work on your project",
  "Core build is under way, progress updated",
  "Checkout flow is waiting for your approval",
  "You approved Launch. Project delivered.",
];

/** How far each milestone has got at a given point in the scroll (0..1). */
function stateOf(index: number, raw: number) {
  // Finish slightly before the very end so the last sign-off is seen.
  const p = raw * 1.03;
  const start = index * 0.25;
  if (p >= start + 0.25) return "Approved";
  if (p >= start + 0.17) return "Awaiting your approval";
  if (p >= start) return "In progress";
  return "Upcoming";
}

/** Scroll-driven walk through a project, from kick-off to the client's final sign-off. */
export function ClientJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const [p, setP] = useState(0);
  useMotionValueEvent(smooth, "change", (v) => setP(Math.round(v * 200) / 200));

  const width = useTransform(smooth, [0, 1], ["4%", "100%"]);
  const rotateY = useTransform(smooth, [0, 1], [16, -12]);
  const rotateX = useTransform(smooth, [0, 0.5, 1], [8, 3, 8]);
  const glow = useTransform(smooth, [0, 1], ["rgb(79 70 229 / 0.25)", "rgb(16 185 129 / 0.3)"]);
  const background = useTransform(glow, (c) => `radial-gradient(ellipse at center, ${c}, transparent 65%)`);

  const chapter = Math.min(chapters.length - 1, Math.floor(p * chapters.length));
  const percent = Math.round(4 + p * 96);
  const done = p > 0.965;

  return (
    <div ref={ref} className="relative h-[340vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div className="pointer-events-none absolute top-1/2 right-[5%] h-[620px] w-[900px] -translate-y-1/2" style={{ background }} />
        <div className="relative mx-auto grid w-full max-w-[1760px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-14">
          {/* Chapters */}
          <div>
            <div className="mb-8 flex gap-2">
              {chapters.map((c, i) => (
                <span key={c.title} className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
                  <motion.span className="block h-full origin-left bg-indigo-400" animate={{ scaleX: i < chapter ? 1 : i === chapter ? Math.min(1, p * chapters.length - chapter + 0.05) : 0 }} transition={{ duration: 0.2 }} />
                </span>
              ))}
            </div>
            <div className="relative min-h-[15rem] sm:min-h-[13rem]">
              <AnimatePresence mode="wait">
                <motion.div key={chapter} initial={{ opacity: 0, y: 30, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -30, filter: "blur(8px)" }} transition={{ duration: 0.45, ease: easeOut }}>
                  <p className="text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">
                    {String(chapter + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">{chapters[chapter].title}</h3>
                  <p className="mt-4 max-w-lg text-lg text-white/55">{chapters[chapter].text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* The portal, reacting to the scroll */}
          <div className="px-2 sm:px-10" style={{ perspective: 1600 }}>
            <motion.div className="preserve-3d relative" style={{ rotateY, rotateX }}>
              <div className={clsx("border-glow rounded-[1.75rem] bg-night-2 p-6 shadow-[0_60px_120px_-40px_rgb(0_0_0_/_0.9)] transition-shadow duration-700 sm:p-8", done && "shadow-[0_60px_140px_-30px_rgb(16_185_129_/_0.35)]")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/40">Your project</p>
                    <p className="text-xl font-semibold text-white">Customer web app</p>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={done ? "d" : "t"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={clsx("rounded-full px-3 py-1 text-xs font-medium", done ? "bg-emerald-500 text-white" : "bg-emerald-400/10 text-emerald-300")}
                    >
                      {done ? "Delivered" : "On track"}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div className={clsx("h-full rounded-full transition-colors duration-500", done ? "bg-emerald-400" : "bg-indigo-400")} style={{ width }} />
                    <motion.div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent" animate={{ left: ["-20%", "110%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
                  </div>
                  <span className="w-14 text-right text-2xl font-semibold text-white tabular-nums">{percent}%</span>
                </div>

                <ul className="mt-6 space-y-2.5">
                  {milestones.map((m, i) => {
                    const s = stateOf(i, p);
                    return (
                      <motion.li
                        key={m}
                        animate={{ scale: s === "Awaiting your approval" ? 1.025 : 1, backgroundColor: s === "Awaiting your approval" ? "rgb(251 191 36 / 0.1)" : "rgb(255 255 255 / 0.04)" }}
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                      >
                        <span className={clsx("flex items-center gap-3", s === "Upcoming" ? "text-white/40" : "text-white/90")}>
                          <span
                            className={clsx(
                              "flex size-5 items-center justify-center rounded-full transition-colors duration-300",
                              s === "Approved" ? "bg-emerald-500" : s === "Awaiting your approval" ? "bg-amber-400" : s === "In progress" ? "bg-indigo-400" : "border border-white/25",
                            )}
                          >
                            <AnimatePresence>
                              {s === "Approved" && (
                                <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                                  <Check className="size-3 text-white" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                            {s === "In progress" && <motion.span className="size-2 rounded-full bg-white" animate={{ scale: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />}
                          </span>
                          {m}
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={s}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className={clsx("text-xs", s === "Approved" ? "text-emerald-300" : s === "Awaiting your approval" ? "font-medium text-amber-300" : s === "In progress" ? "text-indigo-300" : "text-white/35")}
                          >
                            {s}
                          </motion.span>
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              {/* Latest update, floating in front */}
              <div className="absolute -bottom-12 -left-2 w-72 sm:-left-10" style={{ transform: "translateZ(90px)" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chapter}
                    initial={{ opacity: 0, y: 20, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.92 }}
                    transition={{ duration: 0.35, ease: easeOut }}
                    className="border-glow flex items-start gap-3 rounded-2xl bg-night-2 p-4 shadow-2xl"
                  >
                    <span className={clsx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl", chapter === 3 ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-indigo-300")}>
                      {chapter >= 2 ? <ThumbsUp className="size-4" /> : <MessageSquare className="size-4" />}
                    </span>
                    <span>
                      <span className="block text-[11px] text-white/40">Latest update</span>
                      <span className="block text-sm text-white/85">{updates[chapter]}</span>
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
