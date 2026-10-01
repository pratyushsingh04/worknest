"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordStrength } from "@/components/password-strength";
import { Button, Field, FormError, Input, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ name: string; email: string }>(`/auth/reset-password/${token}`).then(setAccount, (err) => setLoadError(errorMessage(err)));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match");
    setSaving(true);
    setError(null);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <AuthShell title="This link doesn't work" subtitle={loadError}>
        <Link href="/forgot-password" className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-gradient font-medium text-white">
          Send me a new link
        </Link>
      </AuthShell>
    );
  }

  if (!account) {
    return (
      <AuthShell title="Checking your link…">
        <Spinner />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Hi ${account.name.split(" ")[0]}, choose a password`} subtitle="You'll be signed in straight after.">
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm">
        <Mail className="size-4 text-muted" /> {account.email}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="New password">
          <Input type="password" required minLength={8} autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <PasswordStrength password={password} />
        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Save password &amp; sign in <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
