"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOut } from "@/components/motion";

/** Section intro: eyebrow, a heading whose words rise in one by one, and a lead paragraph. */
export function SectionIntro({ eyebrow, title, lead, align = "center", children }: { eyebrow: string; title: string; lead?: string; align?: "center" | "left"; children?: ReactNode }) {
  const words = title.split(" ");
  const center = align === "center";
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <motion.p
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <span className="h-px w-6 bg-indigo-400/60" /> {eyebrow}
      </motion.p>
      <h2 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "105%", opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.05 + i * 0.04, ease: easeOut }}
            >
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </h2>
      {lead && (
        <motion.p
          className={`mt-5 text-lg leading-relaxed text-white/55 ${center ? "mx-auto max-w-2xl" : ""}`}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.25, ease: easeOut }}
        >
          {lead}
        </motion.p>
      )}
      {children}
    </div>
  );
}
