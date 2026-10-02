"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { Building2, CalendarDays, Mail, Megaphone, Phone, Send, Tag, Wallet } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Field, FormError, Modal, PageHeader, PageLoader, Select, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { teamColor } from "@/lib/team-colors";
import { useApi } from "@/lib/use-api";
import type { Lead } from "@/lib/market-types";
import type { TeamColor } from "@/lib/types";

type TeamOption = { id: string; name: string; color: TeamColor };
type Filter = "OPEN" | "ANSWERED" | "WON";
const filters: { key: Filter; label: string }[] = [
  { key: "OPEN", label: "Open to you" },
  { key: "ANSWERED", label: "You responded" },
  { key: "WON", label: "Won" },
];

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user.role === "ADMIN" || user.role === "MANAGER";
  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const { data, error, loading, reload } = useApi<{ needs: Lead[]; teams: TeamOption[]; isListed: boolean }>(allowed ? "/needs" : null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [answering, setAnswering] = useState<Lead | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on("need:changed", reload);
    return () => {
      socket.off("need:changed", reload);
    };
  }, [reload]);

  if (!allowed) return null;

  const visible = (data?.needs ?? []).filter((n) =>
    filter === "OPEN" ? n.status === "OPEN" && !n.myProposal : filter === "ANSWERED" ? n.myProposal && n.myProposal.status !== "ACCEPTED" : n.myProposal?.status === "ACCEPTED",
  );

  return (
    <>
      <PageHeader icon={Megaphone} title="Client needs" description="Work clients are looking for right now. Reach out directly, or send a proposal naming the team that would take it." />

      {data && !data.isListed && (
        <Card className="mb-5 flex flex-col gap-3 border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Clients can&apos;t open your company page yet, so proposals are switched off. Complete your public profile first.</span>
          {user.role === "ADMIN" && (
            <ButtonLink href="/settings#profile" size="sm">
              Complete profile
            </ButtonLink>
          )}
        </Card>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx("relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors", filter === f.key ? "text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink")}
          >
            {filter === f.key && <motion.span layoutId="lead-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load client needs"} onRetry={reload} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === "OPEN" ? "No open needs right now" : filter === "ANSWERED" ? "No proposals waiting" : "Nothing won yet"}
            description={filter === "OPEN" ? "When a client posts what they are looking for, it appears here for every listed company." : undefined}
          />
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {visible.map((n) => (
            <StaggerItem key={n.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{n.title}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
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
                      <span>Posted {timeAgo(n.createdAt)}</span>
                      <span>
                        {n.proposalCount} {n.proposalCount === 1 ? "company has" : "companies have"} responded
                      </span>
                    </div>
                  </div>
                  {n.myProposal ? (
                    <Badge tone={n.myProposal.status === "ACCEPTED" ? "green" : n.myProposal.status === "DECLINED" ? "red" : "blue"} dot>
                      {n.myProposal.status === "ACCEPTED" ? "Proposal accepted" : n.myProposal.status === "DECLINED" ? "Not chosen" : "Proposal sent"}
                    </Badge>
                  ) : (
                    n.status === "CLOSED" && <Badge>Closed</Badge>
                  )}
                </div>

                <p className="mt-3 text-sm whitespace-pre-line text-ink/80">{n.details}</p>

                {/* Who is asking, so the company can contact them directly. */}
                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={n.client.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.client.name}</p>
                      {n.client.organisation && (
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          <Building2 className="size-3" /> {n.client.organisation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={`mailto:${n.client.email}?subject=${encodeURIComponent(`Re: ${n.title}`)}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                      <Mail className="size-4" /> {n.client.email}
                    </a>
                    {n.client.phone && (
                      <a href={`tel:${n.client.phone}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                        <Phone className="size-4" /> {n.client.phone}
                      </a>
                    )}
                  </div>
                </div>

                {n.myProposal ? (
                  <div className="mt-4 rounded-xl border border-line px-4 py-3 text-sm">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <span className={clsx("size-2 rounded-full", teamColor[n.myProposal.team.color].dot)} />
                      Your proposal · {n.myProposal.team.name}
                      {n.myProposal.author && ` · ${n.myProposal.author.name}`} · {timeAgo(n.myProposal.createdAt)}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-ink/80">{n.myProposal.message}</p>
                    {n.myProposal.status === "ACCEPTED" && (
                      <ButtonLink href="/requests" size="sm" className="mt-3">
                        Start the project from Requests
                      </ButtonLink>
                    )}
                  </div>
                ) : (
                  n.status === "OPEN" && (
                    <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                      <Button size="sm" disabled={!data.isListed || data.teams.length === 0} onClick={() => setAnswering(n)}>
                        <Send className="size-4" /> Send a proposal
                      </Button>
                      {data.isListed && data.teams.length === 0 && <span className="text-xs text-muted">Create a client-facing team first, so the proposal can name who would do the work.</span>}
                    </div>
                  )
                )}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {answering && data && (
        <ProposalModal
          key={answering.id}
          lead={answering}
          teams={data.teams}
          onClose={() => setAnswering(null)}
          onSent={() => {
            setAnswering(null);
            setFilter("ANSWERED");
            reload();
          }}
        />
      )}
    </>
  );
}

function ProposalModal({ lead, teams, onClose, onSent }: { lead: Lead; teams: TeamOption[]; onClose: () => void; onSent: () => void }) {
  const toast = useToast();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/needs/${lead.id}/proposals`, { teamId, message });
      toast(`Proposal sent to ${lead.client.name}`);
      onSent();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Proposal for "${lead.title}"`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Team that would do the work" hint="The client sees this team, its lead and its members on your company page.">
          <Select required value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Your message" hint="How you would approach it, a rough timeline and cost. One proposal per company, so make it count.">
          <Textarea required minLength={20} maxLength={3000} rows={7} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <Send className="size-4" /> Send proposal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
