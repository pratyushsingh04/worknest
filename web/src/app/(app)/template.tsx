"use client";

import { motion } from "motion/react";
import { easeOut } from "@/components/motion";

// Re-mounts on every navigation, so each page glides in.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      style={{ transformPerspective: 1600, transformOrigin: "50% 0%" }}
      initial={{ opacity: 0, y: 16, rotateX: 4, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
