"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { Loader2, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { initials } from "@/lib/format";
import { CountUp, TiltCard, easeOut } from "./motion";
import { Icon3D } from "./three-d";
import type { LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return clsx(
    "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60",
    { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size],
    {
      primary: "bg-brand-gradient text-white shadow-[0_1px_2px_rgb(17_17_24_/_0.2),inset_0_1px_0_rgb(255_255_255_/_0.15)] hover:brightness-110",
      secondary: "border border-line bg-surface text-ink hover:border-brand/40 hover:bg-brand-soft/40",
      ghost: "text-muted hover:bg-brand-soft/60 hover:text-ink",
      danger: "bg-red-600 text-white hover:bg-red-700",
      success: "bg-emerald-600 text-white hover:bg-emerald-700",
    }[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

/** A link that looks like a button (never nest a <button> inside a link). */
export function ButtonLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink transition-shadow placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, "h-11", className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(fieldClass, "min-h-20 py-2.5", className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(fieldClass, "h-11", className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(17,17,24,0.04)]",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_16px_32px_-20px_rgba(17,17,24,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type Tone = "gray" | "blue" | "green" | "amber" | "red" | "purple";

export function Badge({ tone = "gray", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        {
          gray: "bg-gray-50 text-gray-700 ring-gray-200",
          blue: "bg-blue-50 text-blue-700 ring-blue-200/70",
          green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
          amber: "bg-amber-50 text-amber-800 ring-amber-200/70",
          red: "bg-red-50 text-red-700 ring-red-200/70",
          purple: "bg-brand-soft text-brand-dark ring-brand/20",
        }[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-gray-100", className)}>
      <motion.div
        className={clsx("h-full rounded-full", percent === 100 ? "bg-emerald-500" : "bg-brand-gradient")}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.9, ease: easeOut }}
      />
    </div>
  );
}

const avatarColors = [
  "from-indigo-400 to-indigo-600",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-blue-500",
  "from-slate-400 to-slate-600",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = avatarColors[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span
      title={name}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm",
        { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm" }[size],
        color,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("size-5 animate-spin text-brand", className)} />;
}

export function PageLoader() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200/70" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200/60" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-gray-200/50" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-line">
        <span className="size-2.5 rounded-full bg-gray-300" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, action, eyebrow, icon }: { title: string; description?: string; action?: ReactNode; eyebrow?: string; icon?: LucideIcon }) {
  return (
    <div className="relative mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="hidden sm:block">
            <Icon3D icon={icon} />
          </div>
        )}
        <div>
          {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wider text-brand uppercase">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const iconTiles = {
  violet: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "violet",
  suffix,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof iconTiles;
  suffix?: string;
}) {
  return (
    <TiltCard className="relative h-full rounded-2xl" max={4}>
      <Card className="relative h-full overflow-hidden p-5 transition-shadow duration-300 hover:shadow-[0_18px_36px_-22px_rgba(17,17,24,0.3)]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{label}</p>
          {icon && <span className={clsx("flex size-9 items-center justify-center rounded-xl ring-1 [transform:translateZ(30px)]", iconTiles[tone])}>{icon}</span>}
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-ink [transform:translateZ(24px)]">{typeof value === "number" ? <CountUp value={value} suffix={suffix} /> : value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </Card>
    </TiltCard>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  // Portalled to <body> so transformed/animated ancestors can't trap the fixed overlay.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-night/50 p-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx("w-full rounded-2xl border border-line bg-surface shadow-2xl", wide ? "max-w-2xl" : "max-w-md")}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ transformPerspective: 1100 }}
            initial={{ opacity: 0, y: 24, scale: 0.97, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, rotateX: 4 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/70"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// ---- Toasts -----------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

const toastIcon = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = toastIcon[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-night px-4 py-3 text-sm text-white shadow-2xl"
              >
                <Icon className={clsx("mt-0.5 size-4 shrink-0", { success: "text-emerald-400", error: "text-red-400", info: "text-indigo-300" }[t.tone])} />
                {t.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
