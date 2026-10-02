"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarDays, Check, CircleDashed, Crown, MessageSquare, RotateCcw, Send, ThumbsUp, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Bar, CButton, CError, CErrorState, CField, CLoader, CModal, CTextarea, Chip, Eyebrow, Face, Monogram, Panel, Ring, Rise, milestoneChip, projectChip, teamTint } from "@/components/client/ui";
import { easeOut } from "@/components/motion";
import { useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import type { Activity, Comment, Milestone, Progress, ProjectStatus, TaskStatus, TeamColor, UserBrief } from "@/lib/types";

interface ClientTask {
  id: string;
  title: string;
  status: TaskStatus;
  milestoneId: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string } | null;
}

interface Detail {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
    company: { id: string; name: string; slug: string };
    team: { id: string; name: string; color: TeamColor; tagline: string | null; lead: UserBrief | null } | null;
    manager: UserBrief | null;
    members: { user: UserBrief }[];
    milestones: Milestone[];
    tasks: ClientTask[];
    progress: Progress;
  };
}

const taskDot: Record<TaskStatus, string> = { TODO: "bg-white/25", IN_PROGRESS: "bg-sky-400", IN_REVIEW: "bg-amber-400", DONE: "bg-emerald-400" };
const taskWord: Record<TaskStatus, string> = { TODO: "Queued", IN_PROGRESS: "Being built", IN_REVIEW: "In review", DONE: "Done" };

export default function ClientProjectPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [reviewing, setReviewing] = useState<Milestone | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(
    () =>
      Promise.all([api.get<Detail>(`/projects/${id}`), api.get<{ activities: Activity[] }>(`/projects/${id}/activity`)]).then(
        ([detail, feed]) => {
          setData(detail);
          setActivity(feed.activities);
          setError(null);
        },
        (err) => setError(errorMessage(err)),
      ),
    [id],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // The same events the team sees, limited to what a client is allowed to.
  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit("project:join", id);
      setLive(true);
    };
    const onDisconnect = () => setLive(false);
    if (socket.connected) join();
    const mine = (p: { projectId?: string }) => (!p.projectId || p.projectId === id) && fetchAll();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("project:progress", mine);
    socket.on("project:updated", mine);
    socket.on("activity:new", mine);
    return () => {
      socket.emit("project:leave", id);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("project:progress", mine);
      socket.off("project:updated", mine);
      socket.off("activity:new", mine);
    };
  }, [id, fetchAll]);

  async function approve(m: Milestone) {
    setBusy(m.id);
    try {
      await api.post(`/projects/${id}/milestones/${m.id}/review`, { decision: "APPROVED" });
      toast(`Approved "${m.title}"`);
      await fetchAll();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <CErrorState message={error} onRetry={fetchAll} />;
  if (!data) return <CLoader label="Opening project" />;

  const p = data.project;
  const tint = p.team ? teamTint[p.team.color] : teamTint.emerald;
  const status = projectChip[p.status];
  const people = p.members.map((m) => m.user);
  const leadId = p.team?.lead?.id ?? p.manager?.id;
  const waiting = p.milestones.filter((m) => m.status === "AWAITING_APPROVAL");
  const counts = { DONE: 0, IN_REVIEW: 0, IN_PROGRESS: 0, TODO: 0 } as Record<TaskStatus, number>;
  p.tasks.forEach((t) => counts[t.status]++);

  return (
    <div className="space-y-10">
      <Link href="/client/projects" className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="size-4" /> Your projects
      </Link>

      {/* Where it stands */}
      <section className="-mt-4 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <motion.div className="flex flex-wrap items-center gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeOut }}>
            <Link href={`/client/companies/${p.company.slug}`} className="flex items-center gap-2 text-sm text-white/60 hover:text-emerald-300">
              <Monogram name={p.company.name} size="sm" /> {p.company.name}
            </Link>
            <Chip tone={status.tone}>{status.label}</Chip>
            <Chip tone={live ? "emerald" : "neutral"}>
              <span className="relative flex size-1.5">
                {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400" />}
                <span className={clsx("relative inline-flex size-1.5 rounded-full", live ? "bg-emerald-400" : "bg-white/40")} />
              </span>
              {live ? "Live" : "Connecting"}
            </Chip>
          </motion.div>
          <motion.h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.6, ease: easeOut }}>
            {p.name}
          </motion.h1>
          {p.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-white/55">{p.description}</p>}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
            {p.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Started {formatDate(p.startDate)}
              </span>
            )}
            {p.dueDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Due {formatDate(p.dueDate)}
              </span>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.7, rotateY: -40 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ duration: 0.9, ease: easeOut }} style={{ transformPerspective: 900 }}>
          <Panel className="flex items-center gap-6 p-6">
            <Ring percent={p.progress.percent} size={150} stroke={11} color={p.status === "COMPLETED" ? "#a78bfa" : tint.stroke}>
              <span className="text-4xl font-semibold tabular-nums">{p.progress.percent}%</span>
              <span className="text-[11px] text-white/45">complete</span>
            </Ring>
            <dl className="space-y-2 text-sm">
              {(["DONE", "IN_REVIEW", "IN_PROGRESS", "TODO"] as TaskStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2.5">
                  <span className={clsx("size-2 rounded-full", taskDot[s])} />
                  <dt className="w-24 text-white/50">{taskWord[s]}</dt>
                  <dd className="font-semibold tabular-nums">{counts[s]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </motion.div>
      </section>

      {/* Sign-off call */}
      <AnimatePresence>
        {waiting.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Panel className="flex flex-col gap-4 p-5 ring-1 ring-amber-400/30 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-3 text-sm">
                <span className="relative flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                  <span className="absolute inset-0 animate-ping rounded-xl bg-amber-400/20" />
                  <ThumbsUp className="relative size-4" />
                </span>
                <span>
                  <span className="font-semibold">{waiting.length === 1 ? `"${waiting[0].title}" is ready for you.` : `${waiting.length} milestones are ready for you.`}</span>{" "}
                  <span className="text-white/55">Approve the work, or send it back with a note.</span>
                </span>
              </p>
              <a href="#milestones" className="shrink-0 text-sm font-medium text-amber-300 hover:underline">
                Review below
              </a>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {/* Milestones */}
          <Rise>
            <Panel className="p-6 sm:p-7">
              <div id="milestones" className="scroll-mt-28">
                <Eyebrow>Milestones</Eyebrow>
              </div>
              {p.milestones.length === 0 ? (
                <p className="mt-5 text-sm text-white/45">The team hasn&apos;t set milestones yet. When they do, each one will come to you for sign-off.</p>
              ) : (
                <ol className="mt-6">
                  {p.milestones.map((m, i) => {
                    const chip = milestoneChip[m.status];
                    const tasks = p.tasks.filter((t) => t.milestoneId === m.id);
                    const done = tasks.filter((t) => t.status === "DONE").length;
                    const approved = m.status === "APPROVED";
                    const awaiting = m.status === "AWAITING_APPROVAL";
                    return (
                      <motion.li key={m.id} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5, ease: easeOut }} className="relative flex gap-4 pb-7 last:pb-0">
                        {i < p.milestones.length - 1 && <span className={clsx("absolute top-9 bottom-0 left-[15px] w-0.5 rounded-full", approved ? "bg-emerald-400/60" : "bg-white/10")} />}
                        <span
                          className={clsx(
                            "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            approved ? "bg-emerald-400 text-night" : awaiting ? "bg-amber-400 text-night" : m.status === "IN_PROGRESS" ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/40" : m.status === "CHANGES_REQUESTED" ? "bg-rose-400/20 text-rose-300 ring-1 ring-rose-400/40" : "bg-white/[0.06] text-white/50 ring-1 ring-white/10",
                          )}
                        >
                          {approved ? <Check className="size-4" /> : i + 1}
                          {awaiting && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />}
                        </span>
                        <div className={clsx("min-w-0 flex-1 rounded-2xl p-4 transition-colors", awaiting ? "bg-amber-400/[0.07] ring-1 ring-amber-400/25" : "bg-white/[0.03]")}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-semibold">{m.title}</h3>
                            <Chip tone={chip.tone}>{chip.label}</Chip>
                          </div>
                          {m.description && <p className="mt-1.5 text-sm whitespace-pre-line text-white/55">{m.description}</p>}
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
                            {m.dueDate && <span>Due {formatDate(m.dueDate)}</span>}
                            {tasks.length > 0 && (
                              <span>
                                {done} of {tasks.length} tasks done
                              </span>
                            )}
                          </div>
                          {tasks.length > 0 && (
                            <div className="mt-2.5">
                              <Bar percent={Math.round((done / tasks.length) * 100)} color={approved ? "bg-emerald-400" : "bg-sky-400"} />
                            </div>
                          )}
                          {m.clientNote && m.status === "CHANGES_REQUESTED" && <p className="mt-3 rounded-xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">Your note: {m.clientNote}</p>}
                          {awaiting && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <CButton size="sm" loading={busy === m.id} onClick={() => approve(m)}>
                                <ThumbsUp className="size-4" /> Approve
                              </CButton>
                              <CButton size="sm" variant="soft" disabled={busy === m.id} onClick={() => setReviewing(m)}>
                                <RotateCcw className="size-4" /> Request changes
                              </CButton>
                            </div>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </Rise>

          {/* What is being built */}
          <Rise delay={0.05}>
            <Panel className="p-6 sm:p-7">
              <Eyebrow>What is being built</Eyebrow>
              {p.tasks.length === 0 ? (
                <p className="mt-5 text-sm text-white/45">Tasks appear here as the team plans the work.</p>
              ) : (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[...p.tasks]
                    .sort((a, b) => ["IN_PROGRESS", "IN_REVIEW", "TODO", "DONE"].indexOf(a.status) - ["IN_PROGRESS", "IN_REVIEW", "TODO", "DONE"].indexOf(b.status))
                    .map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5">
                        <span className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full", t.status === "DONE" ? "bg-emerald-400 text-night" : "bg-white/[0.06]")}>
                          {t.status === "DONE" ? <Check className="size-3" /> : t.status === "TODO" ? <CircleDashed className="size-3 text-white/40" /> : <span className={clsx("size-2 animate-pulse rounded-full", taskDot[t.status])} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={clsx("block truncate text-sm", t.status === "DONE" ? "text-white/45 line-through" : "text-white/85")}>{t.title}</span>
                          <span className="block truncate text-[11px] text-white/35">
                            {taskWord[t.status]}
                            {t.assignee && ` · ${t.assignee.name}`}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Panel>
          </Rise>

          <Rise delay={0.1}>
            <Conversation projectId={p.id} companyName={p.company.name} />
          </Rise>
        </div>

        <div className="space-y-6">
          {/* Who is on it */}
          <Rise delay={0.05}>
            <Panel className="p-6">
              <Eyebrow icon={UsersRound}>Who is working on this</Eyebrow>
              {p.team && (
                <div className={clsx("mt-5 rounded-2xl p-4", tint.soft)}>
                  <p className={clsx("flex items-center gap-2 font-semibold", tint.text)}>
                    <span className={clsx("size-2.5 rounded-full", tint.dot)} /> {p.team.name} team
                  </p>
                  {p.team.tagline && <p className="mt-1 text-sm text-white/55">{p.team.tagline}</p>}
                </div>
              )}
              <ul className="mt-4 space-y-3">
                {people.length === 0 && <li className="text-sm text-white/45">The team will be named shortly.</li>}
                {[...people]
                  .sort((a, b) => Number(b.id === leadId) - Number(a.id === leadId))
                  .map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <Face name={u.name} className="ring-0" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {u.name}
                          {u.id === leadId && (
                            <Chip tone="amber" icon={Crown}>
                              Lead
                            </Chip>
                          )}
                        </p>
                        <p className="truncate text-xs text-white/45">{u.designation ?? "Team member"}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          </Rise>

          {/* Updates */}
          <Rise delay={0.1}>
            <Panel className="p-6">
              <Eyebrow>Updates</Eyebrow>
              {activity.length === 0 ? (
                <p className="mt-5 text-sm text-white/45">No updates yet.</p>
              ) : (
                <ol className="mt-5 max-h-[520px] space-y-1 overflow-y-auto pr-1 scroll-thin">
                  <AnimatePresence initial={false}>
                    {activity.map((a, i) => (
                      <motion.li key={a.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < activity.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-white/10" />}
                        <Face name={a.actor?.name ?? "WorkNest"} size="sm" className="ring-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white/65">
                            <span className="font-medium text-white">{a.actor?.name ?? "The team"}</span> {a.message}
                          </p>
                          <p className="text-xs text-white/35">{timeAgo(a.createdAt)}</p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </Panel>
          </Rise>
        </div>
      </div>

      {reviewing && (
        <ChangesModal
          key={reviewing.id}
          projectId={p.id}
          milestone={reviewing}
          onClose={() => setReviewing(null)}
          onSent={() => {
            setReviewing(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function ChangesModal({ projectId, milestone, onClose, onSent }: { projectId: string; milestone: Milestone; onClose: () => void; onSent: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/projects/${projectId}/milestones/${milestone.id}/review`, { decision: "CHANGES_REQUESTED", note });
      toast("Sent back to the team");
      onSent();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <CModal open onClose={onClose} title="Request changes" subtitle={milestone.title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <CError message={error} />
        <CField label="What should change?" hint="The team sees this note on the milestone and in the project updates.">
          <CTextarea required minLength={3} maxLength={2000} rows={5} autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
        </CField>
        <div className="flex justify-end gap-2">
          <CButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="submit" loading={saving}>
            Send to the team
          </CButton>
        </div>
      </form>
    </CModal>
  );
}

/** The thread shared between the client and the delivery team, updated live. */
function Conversation({ projectId, companyName }: { projectId: string; companyName: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ comments: Comment[] }>(`/projects/${projectId}/comments`).then((r) => setComments(r.comments));
    const socket = getSocket();
    const onNew = (c: Comment & { projectId?: string }) => {
      if (c.projectId && c.projectId !== projectId) return;
      setComments((prev) => (prev && !prev.some((x) => x.id === c.id) ? [...prev, c] : prev));
    };
    socket.on("comment:new", onNew);
    return () => {
      socket.off("comment:new", onNew);
    };
  }, [projectId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [comments?.length]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const { comment } = await api.post<{ comment: Comment }>(`/projects/${projectId}/comments`, { body });
      setComments((prev) => (prev && !prev.some((x) => x.id === comment.id) ? [...prev, comment] : prev));
      setBody("");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel className="p-6 sm:p-7">
      <Eyebrow icon={MessageSquare}>Conversation with {companyName}</Eyebrow>
      <div ref={listRef} className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1 scroll-thin">
        {!comments ? (
          <p className="text-sm text-white/40">Loading messages…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/45">No messages yet. Ask a question or share feedback, and the whole team sees it.</p>
        ) : (
          comments.map((c) => {
            const mine = c.author.id === user.id;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={clsx("flex gap-2.5", mine && "flex-row-reverse")}>
                <Face name={c.author.name} size="sm" className="mt-1 ring-0" />
                <div className={clsx("max-w-[80%] rounded-2xl px-4 py-2.5", mine ? "rounded-tr-md bg-emerald-400 text-night" : "rounded-tl-md bg-white/[0.06]")}>
                  <p className={clsx("text-[11px] font-medium", mine ? "text-night/60" : "text-white/45")}>
                    {mine ? "You" : c.author.name} · {timeAgo(c.createdAt)}
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      <form onSubmit={onSubmit} className="mt-5 flex items-end gap-2">
        <CTextarea
          className="!min-h-12 flex-1"
          rows={1}
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Message the team…"
          aria-label="Message the team"
        />
        <CButton type="submit" loading={sending} className="!size-12 !px-0" aria-label="Send">
          {!sending && <Send className="size-4" />}
        </CButton>
      </form>
    </Panel>
  );
}
