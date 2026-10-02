"use client";

import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { CopyLink, EmailStatusNote, InviteModal, type EmailStatus } from "@/components/invite-modal";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Modal, PageLoader, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, roleLabel, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Role } from "@/lib/types";

interface Invite {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  designation: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  invitedBy: { id: string; name: string } | null;
}

interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  client: { name: string } | null;
}

const roleTone: Record<Role, "purple" | "blue" | "gray" | "amber"> = { ADMIN: "purple", MANAGER: "blue", EMPLOYEE: "gray", CLIENT: "amber" };

export function Members() {
  const toast = useToast();
  const invites = useApi<{ invites: Invite[] }>("/invites");
  const accounts = useApi<{ users: Account[] }>("/admin/users");
  const [inviting, setInviting] = useState(false);
  const [freshLink, setFreshLink] = useState<{ email: string; link: string; emailStatus: EmailStatus } | null>(null);

  // Captured once per mount; render must stay pure.
  const [now] = useState(() => Date.now());
  const pending = (invites.data?.invites ?? []).filter((i) => !i.acceptedAt);

  async function regenerate(invite: Invite) {
    try {
      const res = await api.post<{ link: string; emailStatus: EmailStatus }>(`/invites/${invite.id}/regenerate`);
      setFreshLink({ email: invite.email, link: res.link, emailStatus: res.emailStatus });
      invites.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function revoke(invite: Invite) {
    if (!confirm(`Revoke the invite for ${invite.email}? The link will stop working.`)) return;
    try {
      await api.del(`/invites/${invite.id}`);
      toast("Invite revoked");
      invites.reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Pending invites"
          subtitle="People who have a link but haven't created their account yet"
          action={
            <Button size="sm" onClick={() => setInviting(true)}>
              <Plus className="size-4" /> Invite
            </Button>
          }
        />
        {invites.loading ? (
          <div className="p-5">
            <PageLoader />
          </div>
        ) : pending.length === 0 ? (
          <EmptyState title="No pending invites" description="Invite teammates or client contacts with a one-time link." />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((i) => {
              const expired = new Date(i.expiresAt).getTime() < now;
              return (
                <li key={i.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={i.name ?? i.email} />
                    <div>
                      <p className="text-sm font-medium">{i.name ?? i.email}</p>
                      <p className="text-xs text-muted">
                        {i.email} · invited by {i.invitedBy?.name ?? "an admin"} {timeAgo(i.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={roleTone[i.role]}>{i.designation ?? roleLabel[i.role]}</Badge>
                    <Badge tone={expired ? "red" : "gray"}>{expired ? "Expired" : `Expires ${formatDate(i.expiresAt)}`}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => regenerate(i)} title="Issue a fresh link">
                      <Link2 className="size-3.5" /> Resend
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke(i)} aria-label={`Revoke invite for ${i.email}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="All accounts" subtitle={`${accounts.data?.users.length ?? 0} people can sign in to this workspace`} />
        {accounts.loading ? (
          <div className="p-5">
            <PageLoader />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Person</th>
                  <th className="px-5 py-2.5 font-medium">Access</th>
                  <th className="px-5 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-5 py-2.5 font-medium">Member since</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accounts.data?.users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                    <td className="px-5 py-3 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={u.isActive ? "green" : "gray"} dot>
                        {u.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {inviting && (
        <InviteModal
          onClose={() => setInviting(false)}
          onCreated={() => {
            invites.reload();
          }}
        />
      )}
      <Modal open={!!freshLink} onClose={() => setFreshLink(null)} title="New invite link">
        {freshLink && (
          <div className="space-y-4">
            <p className="text-sm text-muted">The old link for {freshLink.email} no longer works. This new one is valid for 7 days.</p>
            <EmailStatusNote status={freshLink.emailStatus} to={freshLink.email} />
            <CopyLink link={freshLink.link} />
          </div>
        )}
      </Modal>
    </div>
  );
}
