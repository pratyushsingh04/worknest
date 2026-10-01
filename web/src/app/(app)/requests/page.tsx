"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, Check, Inbox, Rocket, Wallet, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, ErrorState, PageHeader, PageLoader, useToast, type Tone } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { teamColor } from "@/lib/team-colors";
import { useApi } from "@/lib/use-api";
import type { RequestStatus, ServiceRequest } from "@/lib/types";

const statusInfo: Record<RequestStatus, { label: string; tone: Tone; clientLabel: string }> = {
  NEW: { label: "New", tone: "blue", clientLabel: "Sent" },
  IN_REVIEW: { label: "In review", tone: "amber", clientLabel: "Being reviewed" },
  ACCEPTED: { label: "Accepted", tone: "green", clientLabel: "Accepted" },
  DECLINED: { label: "Declined", tone: "red", clientLabel: "Declined" },
  CONVERTED: { label: "Project started", tone: "purple", clientLabel: "Project started" },
};

const steps: RequestStatus[] = ["NEW", "IN_REVIEW", "ACCEPTED", "CONVERTED"];

function StatusTrack({ status }: { status: RequestStatus }) {
  if (status === "DECLINED") return <Badge tone="red">Declined</Badge>;
  const reached = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1.5" aria-label={`Status: ${statusInfo[status].clientLabel}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
            className={clsx("flex size-5 items-center justify-center rounded-full text-[10px]", i <= reached ? "bg-brand text-white" : "bg-gray-100 text-muted")}
          >
            {i <= reached ? <Check className="size-3" /> : i + 1}
          </motion.span>
          {i < steps.length - 1 && <span className={clsx("h-0.5 w-6 rounded-full", i < reached ? "bg-brand" : "bg-gray-200")} />}
        </div>
      ))}
      <span className="ml-2 text-xs font-medium text-ink">{statusInfo[status].clientLabel}</span>
    </div>
  );
}

function RequestMeta({ r }: { r: ServiceRequest }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {r.service && <span>Service: {r.service.title}</span>}
      {r.budget && (
        <span className="flex items-center gap-1">
          <Wallet className="size-3.5" /> {r.budget}
        </span>
      )}
      {r.deadline && (
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" /> Needed by {formatDate(r.deadline)}
        </span>
      )}
      <span>{timeAgo(r.createdAt)}</span>
    </div>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user.role === "EMPLOYEE") router.replace("/dashboard");
  }, [user.role, router]);
  if (user.role === "EMPLOYEE") return null;
  return user.role === "CLIENT" ? <ClientRequests /> : <RequestInbox />;
}

function useLiveRequests(path: string) {
  const result = useApi<{ requests: ServiceRequest[] }>(path);
  const { reload } = result;
  useEffect(() => {
    const socket = getSocket();
    socket.on("request:changed", reload);
    return () => {
      socket.off("request:changed", reload);
    };
  }, [reload]);
  return result;
}

function ClientRequests() {
  const { data, error, loading, reload } = useLiveRequests("/requests");
  return (
    <>
      <PageHeader
        icon={Inbox}
        title="Your requests"
        description="Work you've asked our teams for, and where each request stands."
        action={
          <ButtonLink href="/teams">
            Browse teams <ArrowRight className="size-4" />
          </ButtonLink>
        }
      />
      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load requests"} onRetry={reload} />
      ) : data.requests.length === 0 ? (
        <Card>
          <EmptyState title="No requests yet" description="Pick a team, choose one of its services and tell them what you need." action={<ButtonLink href="/teams">See teams</ButtonLink>} />
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {data.requests.map((r) => (
            <StaggerItem key={r.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <span className={clsx("size-2 rounded-full", teamColor[r.team.color].dot)} /> {r.team.name}
                    </p>
                    <h3 className="mt-1 font-semibold">{r.title}</h3>
                  </div>
                  <StatusTrack status={r.status} />
                </div>
                <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line text-ink/75">{r.details}</p>
                <RequestMeta r={r} />
                {r.response && (
                  <div className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm">
                    <span className="font-medium">{r.team.name}:</span> {r.response}
                  </div>
                )}
                {r.project && (
                  <Link href={`/projects/${r.project.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                    Follow the project <ArrowRight className="size-4" />
                  </Link>
                )}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}

const filters: (RequestStatus | "OPEN" | "ALL")[] = ["OPEN", "ACCEPTED", "CONVERTED", "DECLINED", "ALL"];
const filterLabel = { OPEN: "Open", ACCEPTED: "Accepted", CONVERTED: "Became projects", DECLINED: "Declined", ALL: "All" } as Record<string, string>;

function RequestInbox() {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof filters)[number]>("OPEN");
  const { data, error, loading, reload } = useLiveRequests("/requests");
  const [busy, setBusy] = useState<string | null>(null);

  const visible = (data?.requests ?? []).filter((r) =>
    filter === "ALL" ? true : filter === "OPEN" ? r.status === "NEW" || r.status === "IN_REVIEW" : r.status === filter,
  );

  async function setStatus(r: ServiceRequest, status: "IN_REVIEW" | "ACCEPTED" | "DECLINED") {
    const response = status === "DECLINED" ? (prompt("Let the client know why (optional)") ?? undefined) : status === "ACCEPTED" ? (prompt("Message to the client (optional)") ?? undefined) : undefined;
    setBusy(r.id);
    try {
      await api.patch(`/requests/${r.id}`, { status, response: response || undefined });
      toast(`Request ${statusInfo[status].label.toLowerCase()}`);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function convert(r: ServiceRequest) {
    setBusy(r.id);
    try {
      const { project } = await api.post<{ project: { id: string } }>(`/requests/${r.id}/convert`, {});
      toast("Project created. The whole team has been added.");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader icon={Inbox} title="Client requests" description="Work clients have asked your teams for. Accept it, then turn it into a project in one click." />
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx("relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors", filter === f ? "text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink")}
          >
            {filter === f && <motion.span layoutId="req-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative">{filterLabel[f]}</span>
          </button>
        ))}
      </div>
      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load requests"} onRetry={reload} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState title={filter === "OPEN" ? "Inbox zero" : "Nothing here"} description={filter === "OPEN" ? "New client requests for your teams will land here, live." : undefined} />
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {visible.map((r) => (
            <StaggerItem key={r.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <Avatar name={r.client.name} size="lg" />
                    <div className="min-w-0">
                      <h3 className="font-semibold">{r.title}</h3>
                      <p className="text-sm text-muted">
                        {r.client.name}
                        {r.requestedBy && ` · ${r.requestedBy.name}`} → <span className={clsx("font-medium", teamColor[r.team.color].text)}>{r.team.name}</span>
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusInfo[r.status].tone} dot>
                    {statusInfo[r.status].label}
                  </Badge>
                </div>
                <p className="mt-3 text-sm whitespace-pre-line text-ink/80">{r.details}</p>
                <RequestMeta r={r} />
                {r.response && <p className="mt-3 rounded-xl bg-canvas px-4 py-2.5 text-sm text-muted">Your reply: {r.response}</p>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {r.status === "CONVERTED" && r.project ? (
                    <ButtonLink href={`/projects/${r.project.id}`} size="sm" variant="secondary">
                      Open project <ArrowRight className="size-4" />
                    </ButtonLink>
                  ) : (
                    <>
                      {r.status === "NEW" && (
                        <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => setStatus(r, "IN_REVIEW")}>
                          Mark in review
                        </Button>
                      )}
                      {(r.status === "NEW" || r.status === "IN_REVIEW" || r.status === "DECLINED") && (
                        <Button size="sm" variant="success" disabled={busy === r.id} onClick={() => setStatus(r, "ACCEPTED")}>
                          <Check className="size-4" /> Accept
                        </Button>
                      )}
                      {r.status !== "DECLINED" && (
                        <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => setStatus(r, "DECLINED")}>
                          <X className="size-4" /> Decline
                        </Button>
                      )}
                      {r.status !== "DECLINED" && (
                        <Button size="sm" className="ml-auto" loading={busy === r.id} onClick={() => convert(r)}>
                          <Rocket className="size-4" /> Start project
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
