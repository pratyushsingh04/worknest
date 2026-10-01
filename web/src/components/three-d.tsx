"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { easeOut } from "./motion";

/**
 * An app-icon style tile with real depth: stacked layers form the extrusion and the
 * whole tile tilts toward the pointer. Pure CSS 3D, so the icon stays crisp.
 */
export function Icon3D({ icon: Icon, size = 56 }: { icon: LucideIcon; size?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-28, 28]), { stiffness: 180, damping: 16 });
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [22, -22]), { stiffness: 180, damping: 16 });
  const depth = 10;

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size, perspective: 500 }}
      initial={{ opacity: 0, rotateY: -90, scale: 0.6 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      aria-hidden
    >
      {/* Slow idle sway; the pointer tilt is layered on top of it. */}
      <motion.div className="preserve-3d relative size-full" animate={{ rotateY: [-12, 12, -12] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
      <motion.div className="preserve-3d relative size-full" style={{ rotateX, rotateY }}>
        {/* Extrusion: darker layers pushed back in Z. */}
        {Array.from({ length: depth }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-[28%]"
            style={{ transform: `translateZ(${-i - 1}px)`, background: i === depth - 1 ? "#1e1b4b" : `hsl(243 ${55 - i * 2}% ${38 - i * 1.5}%)` }}
          />
        ))}
        {/* Front face. */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[28%] text-white"
          style={{
            background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)",
            boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -8px 16px rgb(30 27 75 / 0.35)",
          }}
        >
          <Icon style={{ width: size * 0.44, height: size * 0.44, transform: "translateZ(12px)" }} strokeWidth={2} />
        </div>
      </motion.div>
      </motion.div>
      <div className="absolute inset-x-1 -bottom-3 h-3 rounded-full bg-indigo-900/25 blur-md" />
    </motion.div>
  );
}

interface StackItem {
  id: string;
  title: string;
  subtitle: string;
  percent: number;
}

/**
 * Project cards fanned out in 3D. Every few seconds the front card slides to the
 * back, so the banner quietly cycles through live projects. Progress bars are flat
 * and labelled, so values are never read off a 3D shape.
 */
export function ProjectStack3D({ items }: { items: StackItem[] }) {
  const [front, setFront] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setFront((f) => (f + 1) % items.length), 3200);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;
  const ordered = items.map((_, i) => items[(front + i) % items.length]).slice(0, 3);

  return (
    <div className="relative h-44 w-72" style={{ perspective: 1000 }} aria-hidden>
      <div className="preserve-3d relative size-full" style={{ transform: "rotateX(14deg) rotateY(-22deg) rotateZ(2deg)" }}>
        <AnimatePresence initial={false}>
          {ordered.map((item, depth) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, z: -160, y: -40 }}
              animate={{ opacity: 1 - depth * 0.22, z: -depth * 60, y: -depth * 22, x: depth * 18 }}
              exit={{ opacity: 0, z: 80, y: 30, rotateX: -20 }}
              transition={{ duration: 0.7, ease: easeOut }}
              style={{ zIndex: 10 - depth }}
              className="absolute inset-x-0 top-6 rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_40px_-20px_rgb(0_0_0_/_0.8)] backdrop-blur-md"
            >
              <p className="truncate text-sm font-semibold text-white">{item.title}</p>
              <p className="truncate text-xs text-white/50">{item.subtitle}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-indigo-400" initial={{ width: 0 }} animate={{ width: `${item.percent}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
                </div>
                <span className="text-xs font-semibold text-white tabular-nums">{item.percent}%</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
