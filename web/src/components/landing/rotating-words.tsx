"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { easeOut } from "@/components/motion";

/** Cycles through words, each one flipping in on the X axis like a split-flap display. */
export function RotatingWords({ words, interval = 2200, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  // Reserve the width of the longest word so the line never jumps.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className={`relative inline-grid align-bottom ${className}`} style={{ perspective: 700 }}>
      <span className="invisible col-start-1 row-start-1">{longest}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[i]}
          className="col-start-1 row-start-1 text-left"
          style={{ transformOrigin: "50% 50% -0.4em", backfaceVisibility: "hidden" }}
          initial={{ rotateX: -90, opacity: 0, filter: "blur(6px)" }}
          animate={{ rotateX: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ rotateX: 90, opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: easeOut }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
