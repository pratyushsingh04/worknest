import type { TeamColor } from "./types";

/** Tailwind classes per team colour: a solid gradient, a soft tint and a text accent. */
export const teamColor: Record<TeamColor, { gradient: string; soft: string; text: string; ring: string; dot: string }> = {
  indigo: { gradient: "from-indigo-500 to-indigo-700", soft: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200", dot: "bg-indigo-500" },
  emerald: { gradient: "from-emerald-500 to-emerald-700", soft: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  sky: { gradient: "from-sky-500 to-sky-700", soft: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200", dot: "bg-sky-500" },
  amber: { gradient: "from-amber-500 to-orange-600", soft: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-200", dot: "bg-amber-500" },
  rose: { gradient: "from-rose-500 to-rose-700", soft: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", dot: "bg-rose-500" },
  slate: { gradient: "from-slate-600 to-slate-800", soft: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", dot: "bg-slate-500" },
};

export const TEAM_COLORS = Object.keys(teamColor) as TeamColor[];

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
