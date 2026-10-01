"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, FormError, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/login", { email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace. Team members and clients join through the invite link they were emailed."
      footer={
        <>
          Starting a new company?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Work email">
          <Input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
