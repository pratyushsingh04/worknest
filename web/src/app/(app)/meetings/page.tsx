"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { CalendarClock, Check, FileText, Plus, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, PageLoader, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import { meetingTime, type Meeting } from "@/lib/meeting-types";
import type { Staff } from "@/lib/types";

function MeetingRow({ m }: { m: Meeting }) {
  const t = meetingTime(m);
  const names = m.attendees.map((a) => a.user.name);
  return (
    <Link href={`/meetings/${m.id}`} className="block">
      <Card hover className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className={clsx("flex w-24 shrink-0 flex-col items-center rounded-xl px-3 py-2.5 text-center", t.live ? "bg-emerald-50 text-emerald-800" : "bg-brand-soft text-brand-dark")}>
          <span className="text-xs font-medium">{t.day.split(",")[0]}</span>
          <span className="text-lg leading-tight font-semibold">{t.day.split(",")[1]?.trim() ?? t.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{m.title}</h3>
            {t.live && (
              <Badge tone="green" dot>
                Happening now
              </Badge>
            )}
            {m.summary && (
              <Badge tone="purple">
                <Sparkles className="mr-1 inline size-3" />
                Summarised
              </Badge>
            )}
            {!m.summary && t.over && m.hasNotes && <Badge tone="amber">Notes, no summary yet</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {t.range} · {m.durationMin} min · organised by {m.organiser?.name ?? "someone who has left"}
          </p>
          {m.agenda && <p className="mt-1.5 line-clamp-1 text-sm text-ink/70">{m.agenda}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex -space-x-2">
            {names.slice(0, 4).map((n) => (
              <span key={n} className="rounded-full ring-2 ring-surface">
                <Avatar name={n} size="sm" />
              </span>
            ))}
          </span>
          <span className="text-xs text-muted">
            {names.length} {names.length === 1 ? "person" : "people"}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default function MeetingsPage() {
  const { data, error, loading, reload } = useApi<{ upcoming: Meeting[]; past: Meeting[] }>("/meetings");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on("meeting:changed", reload);
    return () => {
      socket.off("meeting:changed", reload);
    };
  }, [reload]);

  const list = data?.[tab] ?? [];

  return (
    <>
      <PageHeader
        icon={CalendarClock}
        title="Meetings"
        description="Schedule a call with colleagues, keep the notes in one place and get the summary, decisions and action items in one click."
        action={
          <Button onClick={() => setScheduling(true)}>
            <Plus className="size-4" /> Schedule a meeting
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {(["upcoming", "past"] as const).map((key) => (
          <button key={key} onClick={() => setTab(key)} className={clsx("relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", tab === key ? "text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink")}>
            {tab === key && <motion.span layoutId="meeting-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative">
              {key === "upcoming" ? "Upcoming" : "Past"}
              {data && <span className="ml-1.5 opacity-60">{data[key].length}</span>}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load meetings"} onRetry={reload} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title={tab === "upcoming" ? "Nothing scheduled" : "No past meetings yet"}
            description={tab === "upcoming" ? "Schedule a meeting and everyone invited is notified. The video call opens right here in WorkNest." : "Once a meeting is over it moves here, with its notes and summary."}
            action={tab === "upcoming" && <Button onClick={() => setScheduling(true)}>Schedule a meeting</Button>}
          />
        </Card>
      ) : (
        <Stagger className="space-y-3">
          {list.map((m) => (
            <StaggerItem key={m.id}>
              <MeetingRow m={m} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {scheduling && <ScheduleModal onClose={() => setScheduling(false)} />}
    </>
  );
}

/** Next quarter-hour at least ten minutes away, formatted for a datetime-local input. */
function defaultStart() {
  const d = new Date(Date.now() + 10 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const people = useApi<{ users: Staff[] }>("/users");
  const [form, setForm] = useState(() => ({ title: "", agenda: "", startsAt: defaultStart(), durationMin: "30" }));
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const colleagues = (people.data?.users ?? []).filter((u) => u.isActive && u.id !== user.id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { meeting } = await api.post<{ meeting: Meeting }>("/meetings", {
        title: form.title,
        agenda: form.agenda || null,
        startsAt: new Date(form.startsAt).toISOString(),
        durationMin: Number(form.durationMin),
        attendeeIds: invited,
      });
      toast(invited.length ? `Scheduled. ${invited.length} ${invited.length === 1 ? "person has" : "people have"} been notified.` : "Scheduled.");
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Schedule a meeting" wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Title">
          <Input required minLength={2} maxLength={120} autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sprint planning" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Starts">
            <Input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </Field>
          <Field label="Minutes">
            <Input type="number" required min={5} max={600} step={5} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
          </Field>
        </div>
        <Field label="Agenda" hint="Optional. What you want to cover.">
          <Textarea rows={3} maxLength={2000} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Invite colleagues</p>
          {people.loading ? (
            <p className="text-sm text-muted">Loading people…</p>
          ) : colleagues.length === 0 ? (
            <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">There is nobody else in your workspace yet. Invite people from the People page, then add them here.</p>
          ) : (
            <div className="grid max-h-52 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 scroll-thin sm:grid-cols-2">
              {colleagues.map((p) => {
                const on = invited.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setInvited(on ? invited.filter((x) => x !== p.id) : [...invited, p.id])}
                    aria-pressed={on}
                    className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", on ? "bg-brand-soft" : "hover:bg-canvas")}
                  >
                    <Avatar name={p.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted">{p.designation ?? p.department ?? "Team member"}</span>
                    </span>
                    <span className={clsx("flex size-5 items-center justify-center rounded-full border", on ? "border-brand bg-brand text-white" : "border-line")}>{on && <Check className="size-3" />}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Video className="size-3.5" /> Video call inside WorkNest
            <FileText className="ml-2 size-3.5" /> Notes
            <Sparkles className="ml-2 size-3.5" /> Summary
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Schedule
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
