"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { Avatar, Button, Field, FormError, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { TEAM_COLORS, teamColor } from "@/lib/team-colors";
import { useApi } from "@/lib/use-api";
import type { Staff, TeamColor, TeamService } from "@/lib/types";

/** Type a value and press Enter (or comma) to add it as a chip. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/,$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={value.length ? "" : placeholder} className="min-w-24 flex-1 bg-transparent py-1 text-sm outline-none" />
    </div>
  );
}

function PeoplePicker({ people, selected, onChange, locked }: { people: Staff[]; selected: string[]; onChange: (ids: string[]) => void; locked?: string | null }) {
  return (
    <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1.5 scroll-thin">
      {people.map((p) => {
        const on = selected.includes(p.id) || p.id === locked;
        return (
          <button
            key={p.id}
            type="button"
            disabled={p.id === locked}
            onClick={() => onChange(on ? selected.filter((id) => id !== p.id) : [...selected, p.id])}
            className={clsx("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors", on ? "bg-brand-soft/70" : "hover:bg-canvas")}
          >
            <Avatar name={p.name} size="sm" />
            <span className="flex-1">
              {p.name} <span className="text-xs text-muted">· {p.designation ?? p.role.toLowerCase()}</span>
            </span>
            {p.id === locked ? <span className="text-xs text-muted">Lead</span> : on && <Check className="size-4 text-brand" />}
          </button>
        );
      })}
    </div>
  );
}

export interface TeamFormValue {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  color: TeamColor;
  leadId: string;
  skills: string[];
  visibleToClients: boolean;
  memberIds: string[];
}

/** Create a team (admin) or edit its profile (admin or lead). Mount while open. */
export function TeamFormModal({ initial, canEditLead, onClose, onSaved }: { initial?: TeamFormValue; canEditLead: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const staff = useApi<{ users: Staff[] }>("/users");
  const [form, setForm] = useState<TeamFormValue>(
    initial ?? { name: "", tagline: "", description: "", color: "indigo", leadId: "", skills: [], visibleToClients: true, memberIds: [] },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const people = (staff.data?.users ?? []).filter((u) => u.isActive);
  const leads = people.filter((u) => u.role !== "EMPLOYEE");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      tagline: form.tagline || null,
      description: form.description || null,
      color: form.color,
      skills: form.skills,
      visibleToClients: form.visibleToClients,
      ...(canEditLead ? { leadId: form.leadId || null } : {}),
      ...(initial ? {} : { memberIds: form.memberIds }),
    };
    try {
      if (initial?.id) {
        await api.patch(`/teams/${initial.id}`, payload);
        onSaved(initial.id);
      } else {
        const { team } = await api.post<{ team: { id: string } }>("/teams", payload);
        onSaved(team.id);
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit team profile" : "Create a team"} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Web Engineering" />
          </Field>
          <Field label="Tagline" hint="One line clients will see">
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Fast, reliable web apps" />
          </Field>
        </div>
        <Field label="About the team">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What the team is great at, how it works with clients…" />
        </Field>
        <Field label="Skills & tools" hint="Press Enter after each one">
          <TagInput value={form.skills} onChange={(skills) => setForm({ ...form, skills })} placeholder="React, Figma, AWS…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {canEditLead && (
            <Field label="Team lead" hint="Leads manage members, services and tasks">
              <Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
                <option value="">No lead yet</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div>
            <p className="mb-1.5 text-sm font-medium">Colour</p>
            <div className="flex gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={clsx("size-9 rounded-xl bg-gradient-to-br ring-offset-2 transition", teamColor[c].gradient, form.color === c ? "ring-2 ring-ink" : "hover:scale-105")}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        {!initial && (
          <Field label="Members">
            <PeoplePicker people={people} selected={form.memberIds} onChange={(memberIds) => setForm({ ...form, memberIds })} locked={form.leadId || null} />
          </Field>
        )}
        <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" className="size-4 accent-brand" checked={form.visibleToClients} onChange={(e) => setForm({ ...form, visibleToClients: e.target.checked })} />
          <span>
            <span className="font-medium">Show this team to clients</span>
            <span className="block text-xs text-muted">Clients can browse its services and send requests from their portal.</span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? "Save" : "Create team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function MembersModal({ teamId, leadId, current, onClose, onSaved }: { teamId: string; leadId: string | null; current: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const staff = useApi<{ users: Staff[] }>("/users");
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/teams/${teamId}/members`, { userIds: selected });
      toast("Team members updated");
      onSaved();
    } catch (err) {
      toast(errorMessage(err), "error");
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Team members">
      <p className="mb-3 text-sm text-muted">Members join every project this team owns, so they can be assigned tasks.</p>
      <PeoplePicker people={(staff.data?.users ?? []).filter((u) => u.isActive)} selected={selected} onChange={setSelected} locked={leadId} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          Save members
        </Button>
      </div>
    </Modal>
  );
}

export function ServiceFormModal({ teamId, service, onClose, onSaved }: { teamId: string; service?: TeamService; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: service?.title ?? "",
    description: service?.description ?? "",
    deliverables: service?.deliverables ?? [],
    turnaround: service?.turnaround ?? "",
    startingPrice: service?.startingPrice?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description,
      deliverables: form.deliverables,
      turnaround: form.turnaround || null,
      startingPrice: form.startingPrice ? Number(form.startingPrice) : null,
    };
    try {
      if (service) await api.patch(`/teams/${teamId}/services/${service.id}`, payload);
      else await api.post(`/teams/${teamId}/services`, payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={service ? "Edit service" : "Add a service"} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Service name">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Web app development" />
        </Field>
        <Field label="Description" hint="What the client gets and how you work">
          <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Deliverables" hint="Press Enter after each one">
          <TagInput value={form.deliverables} onChange={(deliverables) => setForm({ ...form, deliverables })} placeholder="Responsive UI, REST API, Deployment…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Typical turnaround">
            <Input value={form.turnaround} onChange={(e) => setForm({ ...form, turnaround: e.target.value })} placeholder="4-6 weeks" />
          </Field>
          <Field label="Starting price (₹, optional)">
            <Input type="number" min={0} value={form.startingPrice} onChange={(e) => setForm({ ...form, startingPrice: e.target.value })} placeholder="150000" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {service ? "Save" : "Add service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
