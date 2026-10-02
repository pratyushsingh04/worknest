"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CButton, CError, CField, CInput, CTextarea, Eyebrow, Face, Headline, Panel, Rise } from "@/components/client/ui";
import { PasswordStrength } from "@/components/password-strength";
import { useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export default function ClientAccountPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section className="flex items-center gap-5">
        <Face name={user.name} className="!size-16 !text-xl ring-0" />
        <div>
          <Eyebrow icon={UserRound}>Your account</Eyebrow>
          <Headline className="mt-2 !text-4xl sm:!text-5xl">{user.name}</Headline>
        </div>
      </section>
      <Rise>
        <ProfileForm />
      </Rise>
      <Rise delay={0.08}>
        <PasswordForm />
      </Rise>
    </div>
  );
}

function ProfileForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, organisation: user.organisation ?? "", phone: user.phone ?? "", bio: user.bio ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch("/auth/me", { name: form.name, organisation: form.organisation || null, phone: form.phone || null, bio: form.bio || null });
      toast("Profile saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-6 sm:p-7">
      <h2 className="text-lg font-semibold">What companies see about you</h2>
      <p className="mt-1 text-sm text-white/45">Shown next to your requests and the needs you post, so a company knows who to contact.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CField label="Your name">
            <CInput required minLength={2} maxLength={80} value={form.name} onChange={set("name")} />
          </CField>
          <CField label="Your business">
            <CInput maxLength={120} value={form.organisation} onChange={set("organisation")} placeholder="Optional" />
          </CField>
          <CField label="Email" hint="Used to sign in. Companies reply here.">
            <CInput disabled value={user.email} className="opacity-60" />
          </CField>
          <CField label="Phone">
            <CInput type="tel" maxLength={30} value={form.phone} onChange={set("phone")} placeholder="Optional" />
          </CField>
        </div>
        <CField label="About you or your business">
          <CTextarea maxLength={600} rows={3} value={form.bio} onChange={set("bio")} placeholder="Optional. A line or two helps companies tailor what they propose." />
        </CField>
        <CButton type="submit" loading={saving}>
          Save
        </CButton>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/auth/change-password", form);
      setForm({ currentPassword: "", newPassword: "" });
      toast("Password changed");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-6 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="size-4 text-emerald-300" /> Change password
      </h2>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CField label="Current password">
            <CInput type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </CField>
          <CField label="New password">
            <CInput type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </CField>
        </div>
        <div className="rounded-2xl bg-white/[0.92] px-4 py-3 text-ink">
          <PasswordStrength password={form.newPassword} />
        </div>
        <CButton type="submit" loading={saving}>
          Update password
        </CButton>
      </form>
    </Panel>
  );
}
