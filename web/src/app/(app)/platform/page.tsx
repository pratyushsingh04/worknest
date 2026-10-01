"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, FolderKanban, LogIn, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BarList, ColumnChart, SERIES } from "@/components/charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { Avatar, Card, CardHeader, ErrorState, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { formatDate, roleLabel, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Role } from "@/lib/types";

interface PlatformOverview {
  totals: { companies: number; users: number; projects: number; tasks: number; logins7d: number };
  usersByRole: { role: Role; count: number }[];
  signupTrend: { date: string; companies: number }[];
  companies: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    owner: { name: string; email: string } | null;
    counts: { users: number; projects: number; clients: number };
    lastActivityAt: string | null;
  }[];
}

const shortDay = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function PlatformPage() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user.isPlatformAdmin;
  const { data, error, loading, reload } = useApi<PlatformOverview>(allowed ? "/platform/overview" : null);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);
  if (!allowed) return null;
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error ?? "Could not load platform data"} onRetry={reload} />;

  return (
    <>
      <PageHeader icon={Building2} eyebrow="Platform owner" title="All companies on WorkNest" description="Every tenant, how big they are and how active they've been." />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label="Companies" value={data.totals.companies} icon={<Building2 className="size-4" />} tone="violet" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Users" value={data.totals.users} icon={<Users className="size-4" />} tone="sky" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Projects" value={data.totals.projects} hint={`${data.totals.tasks} tasks`} icon={<FolderKanban className="size-4" />} tone="emerald" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Sign-ins, 7 days" value={data.totals.logins7d} icon={<LogIn className="size-4" />} tone="amber" />
        </StaggerItem>
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New companies per day" subtitle="Last 30 days" />
          <div className="p-5">
            <ColumnChart
              ariaLabel="New company signups per day over the last 30 days"
              data={data.signupTrend.map((d) => ({ label: d.date, values: { companies: d.companies } }))}
              series={[{ key: "companies", label: "New companies", color: SERIES.blue }]}
              formatLabel={shortDay}
              height={180}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Users by role" subtitle="Across every company" />
          <div className="p-5">
            <BarList ariaLabel="Users by role across all companies" items={data.usersByRole.map((u) => ({ label: roleLabel[u.role], value: u.count }))} />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Companies" subtitle="Newest first" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Company</th>
                <th className="px-5 py-2.5 font-medium">Owner</th>
                <th className="px-5 py-2.5 text-right font-medium">Users</th>
                <th className="px-5 py-2.5 text-right font-medium">Projects</th>
                <th className="px-5 py-2.5 text-right font-medium">Clients</th>
                <th className="px-5 py-2.5 font-medium">Last active</th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.companies.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p>{c.owner?.name ?? "—"}</p>
                    <p className="text-xs text-muted">{c.owner?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.counts.users}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.counts.projects}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.counts.clients}</td>
                  <td className="px-5 py-3 text-muted">{c.lastActivityAt ? timeAgo(c.lastActivityAt) : "Never"}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
