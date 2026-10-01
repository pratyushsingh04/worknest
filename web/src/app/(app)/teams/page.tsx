"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Stagger, StaggerItem } from "@/components/motion";
import { TeamFlipCard } from "@/components/teams/team-cards";
import { TeamFormModal } from "@/components/teams/team-forms";
import { Button, Card, EmptyState, ErrorState, PageHeader, PageLoader } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { TeamShowcase, TeamSummary } from "@/lib/types";

export default function TeamsPage() {
  const { user } = useAuth();
  return user.role === "CLIENT" ? <ClientTeams /> : <StaffTeams />;
}

function StaffTeams() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ teams: TeamSummary[]; canCreate: boolean }>("/teams");
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        icon={UsersRound}
        title="Teams"
        description="Delivery teams, their leads and what they offer clients."
        action={
          data?.canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New team
            </Button>
          )
        }
      />
      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load teams"} onRetry={reload} />
      ) : data.teams.length === 0 ? (
        <Card>
          <EmptyState
            title="No teams yet"
            description={data.canCreate ? "Create your first team, pick a lead and list the services it offers. Clients will see it in their portal." : "Your admin hasn't created any teams yet."}
            action={data.canCreate && <Button onClick={() => setCreating(true)}>Create a team</Button>}
          />
        </Card>
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((t) => (
            <StaggerItem key={t.id}>
              <TeamFlipCard
                href={`/teams/${t.id}`}
                team={{
                  ...t,
                  stats: [
                    { label: "people", value: new Set([...(t.lead ? [t.lead.id] : []), ...t.members.map((m) => m.user.id)]).size },
                    { label: "projects", value: t._count.projects },
                    { label: "open requests", value: t._count.requests },
                  ],
                }}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {creating && <TeamFormModal canEditLead onClose={() => setCreating(false)} onSaved={(id) => router.push(`/teams/${id}`)} />}
    </>
  );
}

function ClientTeams() {
  const { data, error, loading, reload } = useApi<{ teams: TeamShowcase[] }>("/teams");
  return (
    <>
      <PageHeader icon={UsersRound} title="Teams you can work with" description="Browse what each team does and send them a request. Hover a card to see its services." />
      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load teams"} onRetry={reload} />
      ) : data.teams.length === 0 ? (
        <Card>
          <EmptyState title="No teams to show yet" description="Teams will appear here as soon as they publish their services." />
        </Card>
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((t) => (
            <StaggerItem key={t.id}>
              <TeamFlipCard
                href={`/teams/${t.id}`}
                team={{
                  ...t,
                  stats: [
                    { label: "services", value: t.services.length },
                    { label: "delivered", value: t.projectsDelivered },
                  ],
                }}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
