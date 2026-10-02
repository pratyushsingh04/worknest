"use client";

import { motion } from "motion/react";
import { easeOut } from "@/components/motion";

// Re-mounts on every navigation, so each page swings up into place.
export default function ClientPageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      style={{ transformPerspective: 1800, transformOrigin: "50% 0%" }}
      initial={{ opacity: 0, y: 28, rotateX: 7, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
