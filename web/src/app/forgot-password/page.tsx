"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, FormError, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? undefined : "Enter your work email and we'll send you a link to choose a new one."}
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-line bg-surface p-6 text-center">
          <motion.span
            initial={{ rotateY: 180, scale: 0.5 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            style={{ transformPerspective: 600 }}
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-sm"
          >
            <MailCheck className="size-7" />
          </motion.span>
          <p className="mt-4 text-sm text-muted">
            If <b className="text-ink">{email}</b> has a WorkNest account, a reset link is on its way. It works once and expires in 1 hour.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <Field label="Work email">
            <Input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
