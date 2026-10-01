"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { easeOut } from "./motion";

// Categorical slots 1 and 2 of the validated reference palette (see dataviz skill).
export const SERIES = { blue: "#2a78d6", orange: "#eb6834" } as const;

/** Four equal, whole-number steps that cover `value` (the data are counts). */
function niceScale(value: number) {
  const raw = Math.max(value, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!);
  return { max: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

interface Series {
  key: string;
  label: string;
  color: string;
}

/**
 * Vertical columns, optionally stacked. Thin marks (<= 24px), 4px rounded top,
 * 2px surface gap between stacked segments, recessive hairline grid, hover tooltip.
 */
export function ColumnChart({
  data,
  series,
  height = 200,
  formatLabel = (l) => l,
  ariaLabel,
}: {
  data: { label: string; values: Record<string, number> }[];
  series: Series[];
  height?: number;
  formatLabel?: (label: string) => string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const { max, ticks } = niceScale(Math.max(...totals));
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 8) : data.length > 10 ? 2 : 1;

  return (
    <figure aria-label={ariaLabel}>
      {series.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative w-6 shrink-0 text-right text-[10px] text-muted tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {t.toLocaleString("en-IN")}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0" style={{ height }}>
            {ticks.map((t) => (
              <div key={t} className={`absolute inset-x-0 h-px ${t === 0 ? "bg-[#c3c2b7]" : "bg-[#eeeef3]"}`} style={{ top: `${100 - (t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end" style={{ height }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const total = totals[i];
              return (
                <div
                  key={d.label}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  role="img"
                  aria-label={`${formatLabel(d.label)}: ${series.map((s) => `${s.label} ${d.values[s.key] ?? 0}`).join(", ")}`}
                >
                  {hover === i && <div className="absolute inset-y-0 inset-x-0.5 rounded-md bg-brand/5" />}
                  <motion.div
                    className="relative flex w-full max-w-6 flex-col-reverse gap-[2px]"
                    style={{ height: `${(total / max) * 100}%`, transformOrigin: "bottom" }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.03, ease: easeOut }}
                  >
                    {series.map((s, si) => {
                      const v = d.values[s.key] ?? 0;
                      if (!v) return null;
                      const isTop = series.slice(si + 1).every((x) => !(d.values[x.key] ?? 0));
                      return (
                        <div
                          key={s.key}
                          style={{ flexGrow: v, background: s.color, borderRadius: isTop ? "4px 4px 0 0" : 0, opacity: hover === null || hover === i ? 1 : 0.55 }}
                          className="min-h-[2px] transition-opacity"
                        />
                      );
                    })}
                  </motion.div>
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 min-w-32 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                      <p className="mb-1 font-medium text-ink">{formatLabel(d.label)}</p>
                      {series.map((s) => (
                        <p key={s.key} className="flex items-center justify-between gap-3 text-muted">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-sm" style={{ background: s.color }} /> {s.label}
                          </span>
                          <span className="font-medium text-ink tabular-nums">{d.values[s.key] ?? 0}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex">
            {data.map((d, i) => (
              <span key={d.label} className="flex-1 text-center text-[10px] text-muted">
                {i % labelEvery === 0 || i === data.length - 1 ? formatLabel(d.label) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** Horizontal single-series bars with the value at each tip. */
export function BarList({ items, color = SERIES.blue, ariaLabel }: { items: { label: string; value: number; sub?: string }[]; color?: string; ariaLabel: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3" aria-label={ariaLabel}>
      {items.map((item, i) => (
        <li key={item.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">
              {item.label}
              {item.sub && <span className="ml-1.5 text-xs text-muted">{item.sub}</span>}
            </span>
            <span className="font-medium text-ink tabular-nums">{item.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f5]">
            <motion.div
              className="h-full rounded-full transition-[filter] group-hover:brightness-110"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: easeOut }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
