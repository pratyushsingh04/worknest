"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { InviteModal } from "@/components/invite-modal";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, PageLoader, Select, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, roleLabel } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Role, Staff } from "@/lib/types";

export default function PeoplePage() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole("ADMIN");
  const { data, error, loading, reload } = useApi<{ users: Staff[] }>("/users");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [inviting, setInviting] = useState(false);

  const people = useMemo(() => {
    const q = query.toLowerCase();
    return (data?.users ?? []).filter((u) => [u.name, u.email, u.designation, u.department].some((v) => v?.toLowerCase().includes(q)));
  }, [data, query]);

  async function toggleActive(u: Staff) {
    if (u.isActive && !confirm(`Deactivate ${u.name}? They will no longer be able to sign in.`)) return;
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast(u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <>
      <PageHeader icon={Users}
        title="People"
        description={`${data?.users.filter((u) => u.isActive).length ?? 0} active team members`}
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing("new")}>
                Add manually
              </Button>
              <Button onClick={() => setInviting(true)}>
                <UserPlus className="size-4" /> Invite with link
              </Button>
            </div>
          )
        }
      />
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input className="pl-9" placeholder="Search by name, role or team" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card>
          {people.length === 0 ? (
            <EmptyState title="No one matches that search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-5 py-2.5 font-medium">Role</th>
                    <th className="px-5 py-2.5 font-medium">Department</th>
                    <th className="px-5 py-2.5 font-medium">Reports to</th>
                    <th className="px-5 py-2.5 font-medium">Joined</th>
                    {isAdmin && <th className="px-5 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {people.map((u) => (
                    <tr key={u.id} className={u.isActive ? "" : "opacity-50"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div>
                            <p className="font-medium">
                              {u.name} {u.id === user.id && <span className="text-xs text-muted">(you)</span>}
                            </p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p>{u.designation ?? "—"}</p>
                        <Badge tone={u.role === "ADMIN" ? "purple" : u.role === "MANAGER" ? "blue" : "gray"}>{roleLabel[u.role]}</Badge>
                      </td>
                      <td className="px-5 py-3">{u.department ?? "—"}</td>
                      <td className="px-5 py-3">{u.manager?.name ?? "—"}</td>
                      <td className="px-5 py-3">{formatDate(u.joinedAt)}</td>
                      {isAdmin && (
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                            Edit
                          </Button>
                          {u.id !== user.id && (
                            <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                              {u.isActive ? "Deactivate" : "Reactivate"}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {isAdmin && (
        <EmployeeModal
          person={editing}
          managers={(data?.users ?? []).filter((u) => u.isActive && u.role !== "EMPLOYEE")}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function EmployeeModal({ person, managers, onClose, onSaved }: { person: Staff | "new" | null; managers: Staff[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = person === "new";
  const existing = person && person !== "new" ? person : null;
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE" as Exclude<Role, "CLIENT">, designation: "", department: "", phone: "", managerId: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastPerson, setLastPerson] = useState<typeof person>(null);

  // Reset the form whenever a different person (or "new") is opened.
  if (person !== lastPerson) {
    setLastPerson(person);
    setError(null);
    setForm(
      existing
        ? {
            name: existing.name,
            email: existing.email,
            role: existing.role as Exclude<Role, "CLIENT">,
            designation: existing.designation ?? "",
            department: existing.department ?? "",
            phone: existing.phone ?? "",
            managerId: existing.manager?.id ?? "",
            password: "",
          }
        : { name: "", email: "", role: "EMPLOYEE", designation: "", department: "", phone: "", managerId: "", password: "" },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const common = {
      name: form.name,
      role: form.role,
      designation: form.designation || undefined,
      department: form.department || undefined,
      phone: form.phone || undefined,
      managerId: form.managerId || null,
    };
    try {
      if (existing) await api.patch(`/users/${existing.id}`, common);
      else await api.post("/users", { ...common, email: form.email, password: form.password });
      toast(existing ? "Changes saved" : `${form.name} added. Share their email and temporary password with them.`);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <Modal open={!!person} onClose={onClose} title={isNew ? "Add employee" : `Edit ${existing?.name ?? ""}`} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Work email">
            <Input type="email" required disabled={!isNew} value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Designation">
            <Input value={form.designation} onChange={set("designation")} placeholder="Frontend Developer" />
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={set("department")} placeholder="Engineering" />
          </Field>
          <Field label="Access level">
            <Select value={form.role} onChange={set("role")}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          <Field label="Reports to" hint="Approves their leave">
            <Select value={form.managerId} onChange={set("managerId")}>
              <option value="">No one</option>
              {managers
                .filter((m) => m.id !== existing?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} />
          </Field>
          {isNew && (
            <Field label="Temporary password" hint="At least 8 characters. They can change it in Settings.">
              <Input required minLength={8} value={form.password} onChange={set("password")} />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isNew ? "Add employee" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
