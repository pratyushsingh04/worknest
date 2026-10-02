"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordStrength } from "@/components/password-strength";
import { Button, Field, FormError, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function RegisterClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", organisation: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register-client", { ...form, organisation: form.organisation || undefined, phone: form.phone || undefined });
      router.replace("/client");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell
      audience="client"
      title="Join as a client"
      subtitle="Browse every company on WorkNest, see who works there and what they deliver, then follow your projects live."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
          <span className="mx-2 text-line">|</span>
          Run a company?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input required minLength={2} autoFocus autoComplete="name" value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Your business" hint="Optional. Companies see this when you contact them.">
            <Input maxLength={120} value={form.organisation} onChange={set("organisation")} placeholder="FreshCart" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Phone" hint="Optional">
            <Input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={set("phone")} />
          </Field>
        </div>
        <Field label="Password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        <PasswordStrength password={form.password} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create my account <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
