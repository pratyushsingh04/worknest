"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOut } from "./motion";
import { ProjectStack3D } from "./three-d";

/** Dashboard hero: greeting on the left, live projects stacked in 3D on the right. */
export function WelcomeBanner({
  title,
  subtitle,
  children,
  projects = [],
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  projects?: { id: string; title: string; subtitle: string; percent: number }[];
}) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="relative mb-6 overflow-hidden rounded-3xl bg-night px-6 py-7 text-white sm:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-40 right-0 h-80 w-[60%] bg-[radial-gradient(ellipse_at_center,rgb(79_70_229_/_0.35),transparent_70%)]" />
      </div>
      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-wider text-indigo-300 uppercase">{today}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-white/60">{subtitle}</p>
          {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
        </div>
        {projects.length > 0 && (
          <div className="mr-4 hidden lg:block">
            <ProjectStack3D items={projects} />
          </div>
        )}
      </div>
    </motion.section>
  );
}

export function BannerChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80">{children}</span>;
}
