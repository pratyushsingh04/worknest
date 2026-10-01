"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordStrength } from "@/components/password-strength";
import { Button, Field, FormError, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register-company", form);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="You'll be the admin. Invite your team and clients right after."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Company name">
          <Input required value={form.companyName} onChange={set("companyName")} placeholder="Acme Technologies" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input required autoComplete="name" value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Work email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
        </div>
        <Field label="Password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        <PasswordStrength password={form.password} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create workspace <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
