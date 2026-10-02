"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, CalendarDays, Check, Megaphone, Plus, Tag, Trash2, Wallet, X } from "lucide-react";
import { CButton, CEmpty, CError, CErrorState, CField, CInput, CLoader, CModal, CTextarea, Chip, Eyebrow, Headline, Monogram, Panel, Rise, teamTint } from "@/components/client/ui";
import { easeOut } from "@/components/motion";
import { useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, timeAgo, todayYmd } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import type { MyNeed, Proposal } from "@/lib/market-types";

export default function NeedsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ needs: MyNeed[] }>("/needs");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on("need:changed", reload);
    return () => {
      socket.off("need:changed", reload);
    };
  }, [reload]);

  async function respond(p: Proposal, decision: "ACCEPT" | "DECLINE") {
    if (decision === "ACCEPT" && !confirm(`Go ahead with ${p.company.name}? This closes your need and opens a request with their ${p.team.name} team.`)) return;
    setBusy(p.id);
    try {
      await api.post(`/needs/proposals/${p.id}/respond`, { decision });
      if (decision === "ACCEPT") {
        toast(`${p.company.name} has been told. They will start the project.`);
        router.push("/client/projects#requests");
      } else {
        reload();
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(n: MyNeed, status: "OPEN" | "CLOSED") {
    try {
      await api.patch(`/needs/${n.id}`, { status });
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function remove(n: MyNeed) {
    if (!confirm(`Delete "${n.title}"? Proposals sent for it are removed too.`)) return;
    try {
      await api.del(`/needs/${n.id}`);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow icon={Megaphone}>Let companies come to you</Eyebrow>
          <Headline className="mt-4">Say what you need.</Headline>
          <p className="mt-4 max-w-xl text-lg text-white/55">Describe the project once. Every listed company can see it, with your name and contact, and answer with a proposal naming the team that would do the work.</p>
        </div>
        <CButton size="lg" onClick={() => setPosting(true)}>
          <Plus className="size-4" /> Post a need
        </CButton>
      </section>

      {loading ? (
        <CLoader label="Loading your needs" />
      ) : error || !data ? (
        <CErrorState message={error ?? "Could not load your needs"} onRetry={reload} />
      ) : data.needs.length === 0 ? (
        <Panel>
          <CEmpty
            icon={Megaphone}
            title="Nothing posted yet"
            text="Not sure which company to pick? Post what you are looking for and compare the proposals that come back."
            action={<CButton onClick={() => setPosting(true)}>Post your first need</CButton>}
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {data.needs.map((n, i) => (
            <Rise key={n.id} delay={i * 0.05}>
              <Panel className="p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={n.status === "OPEN" ? "emerald" : "neutral"}>{n.status === "OPEN" ? "Open to proposals" : "Closed"}</Chip>
                      <span className="text-xs text-white/40">Posted {timeAgo(n.createdAt)}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">{n.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                      {n.category && (
                        <span className="flex items-center gap-1">
                          <Tag className="size-3.5" /> {n.category}
                        </span>
                      )}
                      {n.budget && (
                        <span className="flex items-center gap-1">
                          <Wallet className="size-3.5" /> {n.budget}
                        </span>
                      )}
                      {n.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" /> Needed by {formatDate(n.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.proposals.some((p) => p.status === "ACCEPTED") && (
                      <CButton size="sm" variant="ghost" onClick={() => setStatus(n, n.status === "OPEN" ? "CLOSED" : "OPEN")}>
                        {n.status === "OPEN" ? "Close" : "Reopen"}
                      </CButton>
                    )}
                    <CButton size="sm" variant="ghost" onClick={() => remove(n)} aria-label="Delete need">
                      <Trash2 className="size-4" />
                    </CButton>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm whitespace-pre-line text-white/60">{n.details}</p>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm font-medium text-white/70">
                    {n.proposals.length === 0 ? "No proposals yet" : `${n.proposals.length} ${n.proposals.length === 1 ? "proposal" : "proposals"}`}
                  </p>
                  {n.proposals.length === 0 && <p className="mt-1 text-sm text-white/40">Companies are notified in their workspace. You&apos;ll see their answers here the moment they arrive.</p>}
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {n.proposals.map((p) => (
                        <motion.div key={p.id} layout initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: easeOut }} className="flex flex-col rounded-2xl border border-white/10 bg-night/40 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/client/companies/${p.company.slug}`} className="group flex min-w-0 items-center gap-3">
                              <Monogram name={p.company.name} />
                              <span className="min-w-0">
                                <span className="flex items-center gap-1 truncate font-semibold group-hover:text-emerald-300">
                                  {p.company.name} <ArrowUpRight className="size-3.5 opacity-60" />
                                </span>
                                <span className="block truncate text-xs text-white/45">{[p.company.city, p.company.country].filter(Boolean).join(", ")}</span>
                              </span>
                            </Link>
                            {p.status !== "PENDING" && <Chip tone={p.status === "ACCEPTED" ? "emerald" : "neutral"}>{p.status === "ACCEPTED" ? "You chose this" : "Declined"}</Chip>}
                          </div>
                          <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
                            <span className={`size-2 rounded-full ${teamTint[p.team.color].dot}`} /> {p.team.name} team would do the work
                            {p.author && ` · from ${p.author.name}`}
                          </p>
                          <p className="mt-3 text-sm whitespace-pre-line text-white/70">{p.message}</p>
                          <p className="mt-3 text-xs text-white/35">{timeAgo(p.createdAt)}</p>
                          {p.status === "PENDING" && n.status === "OPEN" && (
                            <div className="mt-auto flex gap-2 pt-4">
                              <CButton size="sm" loading={busy === p.id} onClick={() => respond(p, "ACCEPT")}>
                                <Check className="size-4" /> Go with them
                              </CButton>
                              <CButton size="sm" variant="ghost" disabled={busy === p.id} onClick={() => respond(p, "DECLINE")}>
                                <X className="size-4" /> Not this one
                              </CButton>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </Panel>
            </Rise>
          ))}
        </div>
      )}

      {posting && (
        <PostNeedModal
          onClose={() => setPosting(false)}
          onPosted={() => {
            setPosting(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function PostNeedModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", details: "", category: "", budget: "", deadline: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/needs", { title: form.title, details: form.details, category: form.category || null, budget: form.budget || null, deadline: form.deadline || null });
      toast("Posted. Listed companies can now see it.");
      onPosted();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <CModal open onClose={onClose} title="Post what you need" subtitle="Companies see this along with your name, business and contact details." wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <CError message={error} />
        <CField label="In one line">
          <CInput required minLength={5} maxLength={120} autoFocus value={form.title} onChange={set("title")} placeholder="Online ordering app for a restaurant chain" />
        </CField>
        <CField label="Details" hint="What it should do, who will use it, and anything that would help a company give you a realistic answer.">
          <CTextarea required minLength={20} maxLength={4000} rows={6} value={form.details} onChange={set("details")} />
        </CField>
        <div className="grid gap-4 sm:grid-cols-3">
          <CField label="Kind of work" hint="Optional">
            <CInput maxLength={60} value={form.category} onChange={set("category")} placeholder="Mobile app" />
          </CField>
          <CField label="Budget" hint="Optional">
            <CInput maxLength={60} value={form.budget} onChange={set("budget")} placeholder="₹5-8 lakh" />
          </CField>
          <CField label="Needed by" hint="Optional">
            <CInput type="date" min={todayYmd()} value={form.deadline} onChange={set("deadline")} />
          </CField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <CButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="submit" loading={saving}>
            <Megaphone className="size-4" /> Post
          </CButton>
        </div>
      </form>
    </CModal>
  );
}
