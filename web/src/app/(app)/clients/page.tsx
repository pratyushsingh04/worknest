"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Briefcase, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ProjectStatusBadge } from "@/components/shared";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, PageLoader } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ClientOrg } from "@/lib/types";

export default function ClientsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const { data, error, loading, reload } = useApi<{ clients: ClientOrg[] }>("/clients");
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader icon={Briefcase}
        title="Clients"
        description="Companies you deliver for. Give them a portal login to follow their projects live."
        action={
          isAdmin && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add client
            </Button>
          )
        }
      />
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.clients.length ? (
        <Card>
          <EmptyState title="No clients yet" description="Add your first client, then link projects to them." action={isAdmin && <Button onClick={() => setAdding(true)}>Add client</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.clients.map((c) => (
            <Card key={c.id} hover className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size="lg" />
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted">{[c.industry, c.contactEmail].filter(Boolean).join(" · ") || "No details"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Projects</p>
                {c.projects.length === 0 ? (
                  <p className="text-sm text-muted">None yet</p>
                ) : (
                  <ul className="space-y-1.5">
                    {c.projects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <Link href={`/projects/${p.id}`} className="hover:text-brand">
                          {p.name}
                        </Link>
                        <ProjectStatusBadge status={p.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Contact</p>
                {c.account ? (
                  <div className="text-sm">
                    <p className="font-medium">{c.account.name}</p>
                    <a href={`mailto:${c.account.email}`} className="block text-muted hover:text-brand">
                      {c.account.email}
                    </a>
                    {c.account.phone && (
                      <a href={`tel:${c.account.phone}`} className="block text-muted hover:text-brand">
                        {c.account.phone}
                      </a>
                    )}
                    <p className="mt-2 text-xs text-emerald-700">Has a WorkNest client account and follows their projects live.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{c.contactEmail ?? "No contact saved."} Added by hand, so they don&apos;t have a client account.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {isAdmin && (
        <>
          <AddClientModal open={adding} onClose={() => setAdding(false)} onSaved={reload} />
        </>
      )}
    </>
  );
}

function AddClientModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", contactEmail: "", industry: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/clients", form);
      setForm({ name: "", contactEmail: "", industry: "" });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add client">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Company name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </Field>
        <Field label="Industry">
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Fintech" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Add client
          </Button>
        </div>
      </form>
    </Modal>
  );
}
