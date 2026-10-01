"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordStrength } from "@/components/password-strength";
import { Badge, Button, Field, FormError, Input, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/format";
import type { Role } from "@/lib/types";

interface InviteInfo {
  email: string;
  name: string | null;
  role: Role;
  designation: string | null;
  department: string | null;
  manager: string | null;
  projects: { id: string; name: string }[];
  company: { id: string; name: string };
  client: { id: string; name: string } | null;
  invitedBy: string | null;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ invite: InviteInfo }>(`/invites/token/${token}`).then(
      ({ invite }) => {
        setInvite(invite);
        setName(invite.name ?? "");
      },
      (err) => setLoadError(errorMessage(err)),
    );
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/invites/token/${token}/accept`, { name, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <AuthShell title="This link doesn't work" subtitle={loadError}>
        <Link href="/login" className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-gradient font-medium text-white">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  if (!invite) {
    return (
      <AuthShell title="Checking your invite…">
        <Spinner />
      </AuthShell>
    );
  }

  const place = invite.role === "CLIENT" ? `${invite.company.name}'s client portal for ${invite.client?.name}` : invite.company.name;

  return (
    <AuthShell
      title={`Join ${invite.role === "CLIENT" ? invite.client?.name : invite.company.name}`}
      subtitle={
        <>
          {invite.invitedBy ? `${invite.invitedBy} invited you` : "You've been invited"} to {place}.
        </>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted" /> {invite.email}
          </span>
          <Badge tone="purple">{invite.designation ?? roleLabel[invite.role]}</Badge>
        </div>
        {(invite.department || invite.manager || invite.projects.length > 0) && (
          <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {invite.department && (
              <div>
                <dt className="text-xs text-muted">Department</dt>
                <dd className="font-medium">{invite.department}</dd>
              </div>
            )}
            {invite.manager && (
              <div>
                <dt className="text-xs text-muted">Reporting to</dt>
                <dd className="font-medium">{invite.manager}</dd>
              </div>
            )}
            {invite.projects.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">You&apos;ll join</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {invite.projects.map((p) => (
                    <Badge key={p.id} tone="blue">
                      {p.name}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Your full name">
          <Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Choose a password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PasswordStrength password={password} />
        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Create my account <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
