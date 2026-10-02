"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { Loader2, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { easeOut } from "@/components/motion";
import { initials } from "@/lib/format";
import type { MilestoneStatus, ProjectStatus, RequestStatus, TeamColor } from "@/lib/types";

// The client portal has its own look: dark glass, emerald accents, generous type.

/** Six gradients a company's monogram can take, picked from its name so it never changes. */
const monogramHues = ["from-emerald-400 to-teal-600", "from-sky-400 to-indigo-600", "from-amber-300 to-orange-600", "from-rose-400 to-fuchsia-600", "from-violet-400 to-indigo-600", "from-lime-300 to-emerald-600"];
const hueOf = (name: string) => monogramHues[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % monogramHues.length];

export function Monogram({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center bg-gradient-to-br font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.35),0_10px_30px_-10px_rgb(0_0_0_/_0.6)]",
        { sm: "size-9 rounded-xl text-sm", md: "size-12 rounded-2xl text-base", lg: "size-16 rounded-2xl text-xl", xl: "size-24 rounded-[1.75rem] text-3xl" }[size],
        hueOf(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Face({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      title={name}
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-medium text-white ring-2 ring-night-2", size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs", hueOf(name), className)}
    >
      {initials(name)}
    </span>
  );
}

export function FaceStack({ names, max = 5 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="flex items-center">
      <span className="flex -space-x-2">
        {shown.map((n, i) => (
          <Face key={`${n}-${i}`} name={n} size="sm" />
        ))}
      </span>
      {names.length > max && <span className="ml-2 text-xs text-white/50">+{names.length - max}</span>}
    </span>
  );
}

/** A glass surface. `glow` adds a pointer-following light; `tilt` leans it toward the pointer. */
export function Panel({ children, className, glow, as: Tag = "div" }: { children: ReactNode; className?: string; glow?: boolean; as?: "div" | "section" | "article" }) {
  return (
    <Tag
      onPointerMove={
        glow
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
            }
          : undefined
      }
      className={clsx("border-glow group/panel relative overflow-hidden rounded-3xl bg-white/[0.035] backdrop-blur-sm", className)}
    >
      {glow && (
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/panel:opacity-100"
          style={{ background: "radial-gradient(420px circle at var(--x) var(--y), rgb(52 211 153 / 0.1), transparent 45%)" }}
        />
      )}
      {children}
    </Tag>
  );
}

/** Leans toward the pointer in 3D. Wrap a Panel (or a link containing one) in it. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max * 0.8, -max * 0.8]), { stiffness: 170, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 170, damping: 18 });
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Rises and un-tilts into place when scrolled into view. */
export function Rise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      style={{ transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 36, rotateX: 14 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

type Variant = "primary" | "ghost" | "soft" | "danger";
const buttonBase = "relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariant: Record<Variant, string> = {
  primary: "bg-emerald-400 text-night shadow-[0_10px_30px_-12px_rgb(52_211_153_/_0.8)] hover:bg-emerald-300",
  soft: "bg-white/10 text-white hover:bg-white/15",
  ghost: "text-white/65 hover:bg-white/10 hover:text-white",
  danger: "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
};
const buttonSize = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base" };

export function CButton({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof buttonSize; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={clsx(buttonBase, buttonVariant[variant], buttonSize[size], className)}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function CLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: keyof typeof buttonSize; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={clsx(buttonBase, buttonVariant[variant], buttonSize[size], className)}>
      {children}
    </Link>
  );
}

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white transition-colors placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-emerald-400/10";

export function CInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, "h-12 [color-scheme:dark]", className)} />;
}
export function CTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(fieldClass, "min-h-24 py-3", className)} />;
}
export function CSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(fieldClass, "h-12 [color-scheme:dark]", className)}>
      {children}
    </select>
  );
}
export function CField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white/80">{label}</span>
      {children}
      {hint && <span className="block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export function CError({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200 ring-1 ring-rose-400/20">
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

type ChipTone = "neutral" | "emerald" | "amber" | "sky" | "rose" | "violet";
const chipTone: Record<ChipTone, string> = {
  neutral: "bg-white/[0.06] text-white/70 ring-white/10",
  emerald: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  sky: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  rose: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
  violet: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
};

export function Chip({ tone = "neutral", children, icon: Icon, className }: { tone?: ChipTone; children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset", chipTone[tone], className)}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

export const projectChip: Record<ProjectStatus, { label: string; tone: ChipTone }> = {
  PLANNING: { label: "Planning", tone: "sky" },
  ACTIVE: { label: "In delivery", tone: "emerald" },
  ON_HOLD: { label: "On hold", tone: "amber" },
  COMPLETED: { label: "Delivered", tone: "violet" },
};

export const requestChip: Record<RequestStatus, { label: string; tone: ChipTone }> = {
  NEW: { label: "Sent", tone: "sky" },
  IN_REVIEW: { label: "Being reviewed", tone: "amber" },
  ACCEPTED: { label: "Accepted", tone: "emerald" },
  DECLINED: { label: "Declined", tone: "rose" },
  CONVERTED: { label: "Project started", tone: "violet" },
};

export const milestoneChip: Record<MilestoneStatus, { label: string; tone: ChipTone }> = {
  PENDING: { label: "Upcoming", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "sky" },
  AWAITING_APPROVAL: { label: "Needs your approval", tone: "amber" },
  APPROVED: { label: "Approved", tone: "emerald" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "rose" },
};

/** Accent colours for a team, tuned for the dark theme. */
export const teamTint: Record<TeamColor, { dot: string; text: string; soft: string; stroke: string }> = {
  indigo: { dot: "bg-indigo-400", text: "text-indigo-300", soft: "bg-indigo-400/10", stroke: "#818cf8" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300", soft: "bg-emerald-400/10", stroke: "#34d399" },
  sky: { dot: "bg-sky-400", text: "text-sky-300", soft: "bg-sky-400/10", stroke: "#38bdf8" },
  amber: { dot: "bg-amber-400", text: "text-amber-300", soft: "bg-amber-400/10", stroke: "#fbbf24" },
  rose: { dot: "bg-rose-400", text: "text-rose-300", soft: "bg-rose-400/10", stroke: "#fb7185" },
  slate: { dot: "bg-slate-400", text: "text-slate-300", soft: "bg-slate-400/10", stroke: "#94a3b8" },
};

/** Circular progress that draws itself, with the percentage counted up in the middle. */
export function Ring({ percent, size = 96, stroke = 8, color = "#34d399", children }: { percent: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const r = (size - stroke) / 2;
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? value / 100 : 0 }}
          transition={{ duration: 1.4, ease: easeOut }}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children ?? <span className="text-xl font-semibold tabular-nums">{value}%</span>}</div>
    </div>
  );
}

export function Bar({ percent, color = "bg-emerald-400" }: { percent: number; color?: string }) {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
      <motion.div className={clsx("h-full rounded-full", color)} initial={{ width: 0 }} whileInView={{ width: `${Math.max(0, Math.min(100, percent))}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: easeOut }} />
    </div>
  );
}

export function Eyebrow({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-emerald-300/90 uppercase">
      {Icon ? <Icon className="size-3.5" /> : <span className="h-px w-6 bg-emerald-400/60" />}
      {children}
    </p>
  );
}

/** Page heading whose words rise in one after another. */
export function Headline({ children, className }: { children: string; className?: string }) {
  return (
    <h1 className={clsx("text-4xl leading-[1.06] font-semibold tracking-tight sm:text-5xl lg:text-6xl", className)}>
      {children.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1.5 align-bottom">
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: i * 0.05, ease: easeOut }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

export function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {hint && <p className="mt-1 text-sm text-white/45">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function CLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-28 text-white/40" role="status">
      <span className="relative flex size-12 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
        <span className="size-3 rounded-full bg-emerald-400" />
      </span>
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function CEmpty({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/[0.05] text-emerald-300 ring-1 ring-white/10">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="mt-1.5 max-w-md text-sm text-white/50">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function CErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <CEmpty
      title="Something went wrong"
      text={message}
      action={
        onRetry && (
          <CButton variant="soft" onClick={onRetry}>
            Try again
          </CButton>
        )
      }
    />
  );
}

/** Dark dialog, portalled to <body> so animated ancestors can't trap it. */
export function CModal({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh] text-white backdrop-blur-md" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx("border-glow relative w-full rounded-3xl bg-night-2 shadow-[0_40px_120px_-30px_rgb(0_0_0)]", wide ? "max-w-2xl" : "max-w-lg")}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ transformPerspective: 1100 }}
            initial={{ opacity: 0, y: 40, scale: 0.94, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.97, rotateX: 6 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
