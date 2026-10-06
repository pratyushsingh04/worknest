import type { UserBrief } from "./types";

export interface ActionItem {
  owner: string | null;
  task: string;
  due: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string | null;
  startsAt: string;
  durationMin: number;
  joinUrl: string | null;
  /** Left out of list responses; `hasNotes` says whether any were written. */
  notes?: string | null;
  hasNotes?: boolean;
  summary: string | null;
  decisions: string[];
  actionItems: ActionItem[] | null;
  /** How the summary was produced: by a language model, or by the built-in rules. */
  summaryMode: "ai" | "basic" | null;
  summarisedAt: string | null;
  organiserId: string | null;
  organiser: UserBrief | null;
  attendees: { userId: string; user: UserBrief }[];
}

export function meetingTime(m: Pick<Meeting, "startsAt" | "durationMin">) {
  const start = new Date(m.startsAt);
  const end = new Date(start.getTime() + m.durationMin * 60_000);
  const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return {
    day: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    range: `${time(start)} to ${time(end)}`,
    /** Started but not yet over. */
    live: start.getTime() <= Date.now() && end.getTime() > Date.now(),
    over: end.getTime() <= Date.now(),
  };
}
