"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarClock, Check, Clock, Copy, ListChecks, Sparkles, Trash2, UserRound, Video } from "lucide-react";
import { MeetingCall } from "@/components/meeting-call";
import { easeOut } from "@/components/motion";
import { Avatar, Badge, Button, Card, CardHeader, ErrorState, PageLoader, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { meetingTime, type Meeting } from "@/lib/meeting-types";

interface Detail {
  meeting: Meeting;
  permissions: { canEdit: boolean };
}

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Null until the person types, so notes saved by someone else still show up live.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summarising, setSummarising] = useState(false);
  const [inCall, setInCall] = useState(false);

  const load = useCallback(
    () =>
      api.get<Detail>(`/meetings/${id}`).then(
        (d) => {
          setData(d);
          setError(null);
        },
        (err) => setError(errorMessage(err)),
      ),
    [id],
  );

  useEffect(() => {
    load();
    const socket = getSocket();
    const onChange = (e: { id: string }) => e.id === id && load();
    socket.on("meeting:changed", onChange);
    return () => {
      socket.off("meeting:changed", onChange);
    };
  }, [id, load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;

  const { meeting: m, permissions } = data;
  const t = meetingTime(m);
  const notes = draft ?? m.notes ?? "";
  const dirty = draft !== null && draft !== (m.notes ?? "");

  async function saveNotes() {
    setSaving(true);
    try {
      const res = await api.put<{ meeting: Meeting }>(`/meetings/${m.id}/notes`, { notes });
      setData((d) => (d ? { ...d, meeting: res.meeting } : d));
      setDraft(null);
      toast("Notes saved");
      return true;
    } catch (err) {
      toast(errorMessage(err), "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function summarise() {
    if (dirty && !(await saveNotes())) return;
    setSummarising(true);
    try {
      const res = await api.post<{ meeting: Meeting }>(`/meetings/${m.id}/summarise`);
      setData((d) => (d ? { ...d, meeting: res.meeting } : d));
      toast(res.meeting.summaryMode === "ai" ? "Summary ready" : "Summary ready (basic: the AI model wasn't available)");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSummarising(false);
    }
  }

  async function cancel() {
    if (!confirm(`Cancel "${m.title}"? Everyone invited is told, and the notes are deleted.`)) return;
    try {
      await api.del(`/meetings/${m.id}`);
      router.replace("/meetings");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function copySummary() {
    const lines = [m.title, "", m.summary ?? ""];
    if (m.decisions.length) lines.push("", "Decisions", ...m.decisions.map((d) => `- ${d}`));
    if (m.actionItems?.length) lines.push("", "Action items", ...m.actionItems.map((a) => `- ${a.owner ? `${a.owner}: ` : ""}${a.task}${a.due ? ` (by ${a.due})` : ""}`));
    await navigator.clipboard.writeText(lines.join("\n"));
    toast("Summary copied");
  }

  return (
    <>
      <Link href="/meetings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Meetings
      </Link>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeOut }} className="relative mb-6 overflow-hidden rounded-2xl bg-night p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-[radial-gradient(circle,rgb(99_102_241_/_0.45),transparent_65%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
              <CalendarClock className="size-4" /> {t.day}
              <Clock className="ml-2 size-4" /> {t.range}
              {t.live && <span className="ml-1 rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-night">Happening now</span>}
              {t.over && <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">Ended</span>}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{m.title}</h1>
            {m.agenda && <p className="mt-3 max-w-2xl whitespace-pre-line text-white/65">{m.agenda}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => setInCall(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-night transition-transform hover:scale-[1.03]">
              <Video className="size-4" /> Join the call
            </button>
            {permissions.canEdit && (
              <button onClick={cancel} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 hover:bg-white/10">
                <Trash2 className="size-4" /> Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Notes"
              subtitle="Anyone in the meeting can write here. Paste a transcript or type as you go."
              action={
                <Button size="sm" variant="secondary" onClick={saveNotes} loading={saving} disabled={!dirty}>
                  Save notes
                </Button>
              }
            />
            <div className="p-5">
              <Textarea
                rows={12}
                maxLength={40000}
                value={notes}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={"What was discussed, what was decided and who is doing what.\n\nExample:\nDecided to launch on the 20th.\nRavi will finish the checkout page by Friday."}
                className="min-h-56 leading-relaxed"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">{dirty ? "Unsaved changes" : m.notes ? "Saved" : "Nothing written yet"}</p>
                <Button onClick={summarise} loading={summarising} disabled={notes.trim().length < 40}>
                  <Sparkles className="size-4" /> {m.summary ? "Summarise again" : "Summarise"}
                </Button>
              </div>
            </div>
          </Card>

          <AnimatePresence>
            {m.summary && (
              <motion.div initial={{ opacity: 0, y: 24, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: easeOut }} style={{ transformPerspective: 1200 }}>
                <Card className="overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-line bg-brand-soft/60 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
                        <Sparkles className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold">Summary</h2>
                        <p className="text-xs text-muted">
                          {m.summaryMode === "ai" ? "Written by AI from the notes" : "Basic summary, picked out of the notes by rules"}
                          {m.summarisedAt && ` · ${timeAgo(m.summarisedAt)}`}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={copySummary}>
                      <Copy className="size-3.5" /> Copy
                    </Button>
                  </div>
                  <div className="space-y-6 p-5">
                    <p className="leading-relaxed text-ink/85">{m.summary}</p>

                    {m.decisions.length > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                          <Check className="size-3.5" /> Decisions
                        </h3>
                        <ul className="space-y-2">
                          {m.decisions.map((d, i) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="flex gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-950">
                              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Check className="size-2.5" />
                              </span>
                              {d}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(m.actionItems?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                          <ListChecks className="size-3.5" /> Action items
                        </h3>
                        <ul className="divide-y divide-line rounded-xl border border-line">
                          {m.actionItems!.map((a, i) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }} className="flex flex-col gap-1.5 px-3.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                              <span>{a.task}</span>
                              <span className="flex shrink-0 items-center gap-2">
                                <Badge tone={a.owner ? "blue" : "gray"}>
                                  <UserRound className="mr-1 inline size-3" />
                                  {a.owner ?? "No owner named"}
                                </Badge>
                                {a.due && <Badge tone="amber">by {a.due}</Badge>}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {m.decisions.length === 0 && (m.actionItems?.length ?? 0) === 0 && <p className="text-sm text-muted">The notes don&apos;t mention any decisions or action items.</p>}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="self-start">
          <CardHeader title="Who is invited" subtitle={`${m.attendees.length} ${m.attendees.length === 1 ? "person" : "people"}`} />
          <ul className="divide-y divide-line">
            {m.attendees.map((a) => (
              <li key={a.userId} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={a.user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.user.name}</p>
                  <p className="truncate text-xs text-muted">{a.user.designation ?? "Team member"}</p>
                </div>
                {a.userId === m.organiserId && <Badge tone="purple">Organiser</Badge>}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2.5 border-t border-line px-5 py-4 text-sm text-muted">
            <Video className="mt-0.5 size-4 shrink-0 text-brand" />
            <p>The call runs right here in WorkNest. No link to share and nothing to install: everyone invited presses &quot;Join the call&quot; on this page.</p>
          </div>
        </Card>
      </div>

      {inCall && (
        <MeetingCall
          meetingId={m.id}
          title={m.title}
          onClose={() => setInCall(false)}
          notes={
            <div className="flex h-full flex-col gap-3">
              <Textarea rows={14} maxLength={40000} value={notes} onChange={(e) => setDraft(e.target.value)} placeholder="Type as you talk: what was decided and who is doing what." className="min-h-64 flex-1 leading-relaxed" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">{dirty ? "Unsaved changes" : m.notes ? "Saved" : "Nothing written yet"}</p>
                <Button size="sm" onClick={saveNotes} loading={saving} disabled={!dirty}>
                  Save notes
                </Button>
              </div>
            </div>
          }
        />
      )}
    </>
  );
}
