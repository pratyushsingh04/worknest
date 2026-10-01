"use client";

import { useEffect, useState } from "react";
import { Inbox, Mail, MailCheck, MailX } from "lucide-react";
import { Badge, Button, Card, EmptyState, Modal, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { EmailStatus } from "@/components/invite-modal";

interface EmailRow {
  id: string;
  to: string;
  subject: string;
  kind: string;
  status: EmailStatus;
  error: string | null;
  createdAt: string;
}

const statusBadge = {
  SENT: { tone: "green" as const, label: "Delivered to SMTP", icon: MailCheck },
  FAILED: { tone: "red" as const, label: "Failed", icon: MailX },
  OUTBOX: { tone: "amber" as const, label: "Saved (not sent)", icon: Inbox },
};

const kindLabel: Record<string, string> = { invite: "Invite", password_reset: "Password reset", welcome: "Welcome" };

export function EmailOutbox() {
  const [rows, setRows] = useState<EmailRow[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.get<{ items: EmailRow[]; nextCursor: string | null; emailEnabled: boolean }>("/admin/emails").then(
      (page) => {
        setRows(page.items);
        setCursor(page.nextCursor);
        setEnabled(page.emailEnabled);
      },
      (err) => setError(errorMessage(err)),
    );
  }, []);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await api.get<{ items: EmailRow[]; nextCursor: string | null }>(`/admin/emails?cursor=${cursor}`);
      setRows((r) => [...(r ?? []), ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function open(id: string) {
    try {
      const { email } = await api.get<{ email: { subject: string; html: string } }>(`/admin/emails/${id}`);
      setPreview(email);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {!enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Inbox className="size-4" /> Emails are saved here, not sent
          </p>
          <p className="mt-1 text-sm text-amber-900/80">
            Add your SMTP details to <code className="rounded bg-amber-100 px-1">server/.env</code> (for Gmail: <code className="rounded bg-amber-100 px-1">SMTP_HOST=smtp.gmail.com</code>, port 465, your address and a Google App Password) and restart the API. Until then, open an email below and copy its link.
          </p>
        </div>
      )}
      <Card>
        <div className="border-b border-line p-4">
          <h2 className="text-sm font-semibold">Emails</h2>
          <p className="text-xs text-muted">Invites and password resets sent from this workspace</p>
        </div>
        {error && <p className="p-5 text-sm text-red-600">{error}</p>}
        {!rows ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No emails yet" description="Invite someone and their email will appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((e) => {
              const s = statusBadge[e.status];
              return (
                <li key={e.id}>
                  <button onClick={() => open(e.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-canvas">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.subject}</p>
                      <p className="truncate text-xs text-muted">
                        To {e.to} · {kindLabel[e.kind] ?? e.kind} · {timeAgo(e.createdAt)}
                        {e.error && <span className="text-red-600"> · {e.error}</span>}
                      </p>
                    </div>
                    <Badge tone={s.tone} dot>
                      {s.label}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {cursor && (
          <div className="border-t border-line p-3 text-center">
            <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </Card>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.subject ?? ""} wide>
        {preview && (
          // Sandboxed with no scripts; links open in a new tab.
          <iframe title="Email preview" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={preview.html.replace("<html>", '<html><head><base target="_blank"></head>')} className="h-[560px] w-full rounded-xl border border-line bg-white" />
        )}
      </Modal>
    </div>
  );
}
