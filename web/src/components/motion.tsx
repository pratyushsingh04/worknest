"use client";

import { animate, motion, MotionConfig, useInView, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Respects the OS "reduce motion" setting for every animation below it. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its children in when scrolled into view. */
export function Reveal({ children, delay = 0, y = 24, className, ...props }: { children: ReactNode; delay?: number; y?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerParent = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

/** Children wrapped in <StaggerItem> animate in one after another. */
export function Stagger({ children, className, as = "div", inView = false }: { children: ReactNode; className?: string; as?: "div" | "ul"; inView?: boolean }) {
  const Comp = as === "ul" ? motion.ul : motion.div;
  const trigger = inView ? { whileInView: "show", viewport: { once: true, margin: "-40px" } } : { animate: "show" };
  return (
    <Comp variants={staggerParent} initial="hidden" {...trigger} className={className}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp variants={staggerChild} className={className}>
      {children}
    </Comp>
  );
}

/** Counts up to `value` the first time it becomes visible. */
export function CountUp({ value, duration = 1.2, suffix = "", className }: { value: number; duration?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration, ease: easeOut, onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/** Card that tilts toward the pointer in 3D, with a moving glare. Children can pop out with translateZ. */
export function TiltCard({ children, className, max = 8, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max * 0.75, -max * 0.75]), { stiffness: 160, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 160, damping: 18 });
  const glareX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 25 });
  const background = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgb(255 255 255 / 0.18), transparent 55%)`);

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
        glareOpacity.set(1);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
        glareOpacity.set(0);
      }}
    >
      {children}
      {glare && <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light" style={{ background, opacity: glareOpacity }} />}
    </motion.div>
  );
}

/** A soft light that follows the pointer across the card. */
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x) var(--y), rgb(255 255 255 / 0.06), transparent 45%)" }}
      />
      {children}
    </div>
  );
}
