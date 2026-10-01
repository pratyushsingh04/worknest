"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Card, Modal, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ProjectDetail, Staff } from "@/lib/types";

export function Team({ project, canManage }: { project: ProjectDetail; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const openCount = (userId: string) => project.tasks.filter((t) => t.assignee?.id === userId && t.status !== "DONE").length;
  const doneCount = (userId: string) => project.tasks.filter((t) => t.assignee?.id === userId && t.status === "DONE").length;

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">{project.members.length} people on this project</h2>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit team
          </Button>
        )}
      </div>
      <ul className="divide-y divide-line">
        {project.members.map(({ user }) => (
          <li key={user.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {user.name} {project.manager?.id === user.id && <Badge tone="purple">Manager</Badge>}
              </p>
              <p className="text-xs text-muted">{user.designation ?? "Team member"}</p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>{openCount(user.id)} open</p>
              <p>{doneCount(user.id)} done</p>
            </div>
          </li>
        ))}
      </ul>
      {canManage && editing && <EditTeamModal onClose={() => setEditing(false)} project={project} />}
    </Card>
  );
}

function EditTeamModal({ onClose, project }: { onClose: () => void; project: ProjectDetail }) {
  const toast = useToast();
  const { data } = useApi<{ users: Staff[] }>("/users");
  const [selected, setSelected] = useState(() => project.members.map((m) => m.user.id));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/projects/${project.id}`, { memberIds: selected });
      toast("Team updated");
      onClose();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit team">
      <div className="max-h-80 space-y-1 overflow-y-auto scroll-thin">
        {data?.users
          .filter((u) => u.isActive)
          .map((u) => {
            const isManager = u.id === project.manager?.id;
            return (
              <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-canvas">
                <input
                  type="checkbox"
                  className="accent-brand"
                  disabled={isManager}
                  checked={isManager || selected.includes(u.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, u.id] : selected.filter((id) => id !== u.id))}
                />
                <Avatar name={u.name} size="sm" />
                <span className="flex-1">{u.name}</span>
                <span className="text-xs text-muted">{isManager ? "Manager" : u.designation}</span>
              </label>
            );
          })}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
