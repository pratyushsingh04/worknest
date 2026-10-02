"use client";

import { useState, type FormEvent } from "react";
import { Eye, LocateFixed, Settings2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ProfileWhatFields, ProfileWhereFields, missingForListing, toProfileForm, toProfilePayload, type ProfileForm } from "@/components/company-profile";
import { Badge, Button, Card, CardHeader, Field, FormError, Input, PageHeader, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Company } from "@/lib/types";

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  return (
    <>
      <PageHeader icon={Settings2} title="Settings" />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Your profile" />
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Access</dt>
              <dd className="font-medium">{roleLabel[user.role]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Workspace</dt>
              <dd className="font-medium">{user.company?.name}</dd>
            </div>
          </dl>
        </Card>
        <ChangePassword />
        {hasRole("ADMIN") && <CompanySettings />}
      </div>
    </>
  );
}

function ChangePassword() {
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
      toast("Password updated");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change password" />
      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </Field>
        </div>
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

function CompanySettings() {
  const { data } = useApi<{ company: Company }>("/company");
  return data ? (
    <>
      <PublicProfile company={data.company} />
      <CompanyForm company={data.company} />
    </>
  ) : null;
}

/** What clients read about the company. It is listed in the directory only while complete. */
function PublicProfile({ company }: { company: Company }) {
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm>(() => toProfileForm(company));
  const [listed, setListed] = useState(company.isListed);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...patch }));
  const missing = missingForListing(form);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<{ company: Company }>("/company", toProfilePayload(form));
      setListed(res.company.isListed);
      toast(res.company.isListed ? "Profile saved. Clients can see your company." : "Profile saved. Finish it to appear to clients.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div id="profile" className="scroll-mt-6">
        <CardHeader
          title="Public profile"
          subtitle="This is what clients see in the directory, along with your client-facing teams and their services."
          action={
            <Badge tone={listed ? "green" : "amber"} dot>
              {listed ? "Visible to clients" : "Hidden from clients"}
            </Badge>
          }
        />
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4 p-5">
        {missing.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Eye className="mt-0.5 size-4 shrink-0" />
            <span>To appear in the client directory, add {missing.join(", ")}.</span>
          </p>
        )}
        <FormError message={error} />
        <ProfileWhatFields form={form} set={set} />
        <ProfileWhereFields form={form} set={set} />
        <Button type="submit" loading={saving}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function CompanyForm({ company: c }: { company: Company }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: c.name,
    timezone: c.timezone,
    workStartTime: c.workStartTime,
    officeLat: c.officeLat?.toString() ?? "",
    officeLng: c.officeLng?.toString() ?? "",
    officeRadiusM: c.officeRadiusM.toString(),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return toast("Location isn't available in this browser", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({ ...f, officeLat: p.coords.latitude.toFixed(6), officeLng: p.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => {
        toast("Could not get your location", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch("/company", {
        name: form.name,
        timezone: form.timezone,
        workStartTime: form.workStartTime,
        officeLat: form.officeLat ? Number(form.officeLat) : null,
        officeLng: form.officeLng ? Number(form.officeLng) : null,
        officeRadiusM: Number(form.officeRadiusM),
      });
      toast("Company settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <Card>
      <CardHeader title="Company & attendance rules" subtitle="Only admins can change these." />
      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <Input required value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Timezone" hint="e.g. Asia/Kolkata">
            <Input required value={form.timezone} onChange={set("timezone")} />
          </Field>
          <Field label="Work starts at" hint="Check-ins after this + 15 min are marked late">
            <Input type="time" required value={form.workStartTime} onChange={set("workStartTime")} />
          </Field>
          <Field label="Check-in radius (metres)">
            <Input type="number" min={25} max={5000} required value={form.officeRadiusM} onChange={set("officeRadiusM")} />
          </Field>
          <Field label="Office latitude" hint="Leave empty to allow check-in from anywhere">
            <Input value={form.officeLat} onChange={set("officeLat")} />
          </Field>
          <Field label="Office longitude">
            <Input value={form.officeLng} onChange={set("officeLng")} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={useMyLocation} loading={locating}>
            <LocateFixed className="size-4" /> Use my current location as office
          </Button>
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}
