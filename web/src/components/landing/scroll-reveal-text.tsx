"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

function Word({ children, progress, range, accent }: { children: string; progress: MotionValue<number>; range: [number, number]; accent: boolean }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  const y = useTransform(progress, range, [6, 0]);
  return (
    <motion.span style={{ opacity, y }} className={accent ? "inline-block text-indigo-300" : "inline-block"}>
      {children}&nbsp;
    </motion.span>
  );
}

/** A statement whose words light up one by one as it scrolls through the viewport. */
export function ScrollRevealText({ text, highlight = [] }: { text: string; highlight?: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className="text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} accent={highlight.includes(w)}>
          {w}
        </Word>
      ))}
    </p>
  );
}
