"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, Input, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { roleLabel, timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";
import { deviceFromUA, type LoginRow } from "./overview";

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cursor-paginated list: first page on mount/when `base` changes, more on demand. */
function usePaged<T>(base: string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<Page<T>>(base).then(
      (page) => {
        if (cancelled) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setError(null);
      },
      (err) => !cancelled && setError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [base]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await api.get<Page<T>>(`${base}${base.includes("?") ? "&" : "?"}cursor=${cursor}`);
      setItems((prev) => [...(prev ?? []), ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [base, cursor]);

  return { items, error, hasMore: !!cursor, loadMore, loadingMore };
}

interface AuditItem {
  id: string;
  message: string;
  createdAt: string;
  clientVisible: boolean;
  actor: { id: string; name: string; role: Role } | null;
  project: { id: string; name: string } | null;
}

export function AuditLog() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  const { items, error, hasMore, loadMore, loadingMore } = usePaged<AuditItem>(`/admin/audit?take=30${debounced ? `&q=${encodeURIComponent(debounced)}` : ""}`);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Audit log</h2>
          <p className="text-xs text-muted">Every action taken in the workspace, newest first</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input className="h-10 pl-9" placeholder="Search people, projects, actions" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {error && <p className="p-5 text-sm text-red-600">{error}</p>}
      {!items ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing matches that search" />
      ) : (
        <ol className="relative px-5 py-4">
          <span className="absolute top-6 bottom-6 left-[35px] w-px bg-line" />
          <AnimatePresence initial={false}>
            {items.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.02 }}
                className="relative flex gap-3 py-2.5"
              >
                <span className="relative z-10 rounded-full ring-4 ring-surface">
                  <Avatar name={a.actor?.name ?? "System"} />
                </span>
                <div className="min-w-0 flex-1 pt-1 text-sm">
                  <p>
                    <span className="font-medium">{a.actor?.name ?? "System"}</span> <span className="text-ink/75">{a.message}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span title={new Date(a.createdAt).toLocaleString("en-IN")}>{timeAgo(a.createdAt)}</span>
                    {a.actor && <span>· {roleLabel[a.actor.role]}</span>}
                    {a.project && (
                      <>
                        ·
                        <Link href={`/projects/${a.project.id}`} className="hover:text-brand">
                          {a.project.name}
                        </Link>
                      </>
                    )}
                    {a.clientVisible && <Badge tone="purple">Visible to client</Badge>}
                  </p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      {hasMore && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
            Load older activity
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SignInLog() {
  const [failedOnly, setFailedOnly] = useState(false);
  const { items, error, hasMore, loadMore, loadingMore } = usePaged<LoginRow>(`/admin/logins?take=30${failedOnly ? "&failedOnly=true" : ""}`);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sign-in security log</h2>
          <p className="text-xs text-muted">Every sign-in attempt, including wrong passwords</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-brand" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          Failed attempts only
        </label>
      </div>
      {error && <p className="p-5 text-sm text-red-600">{error}</p>}
      {!items ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No sign-in attempts here" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Account</th>
                <th className="px-5 py-2.5 font-medium">Result</th>
                <th className="px-5 py-2.5 font-medium">Device</th>
                <th className="px-5 py-2.5 font-medium">IP address</th>
                <th className="px-5 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((l) => (
                <tr key={l.id} className={l.success ? "" : "bg-red-50/40"}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={l.user?.name ?? l.email} size="sm" />
                      <div>
                        <p className="font-medium">{l.user?.name ?? "Unknown account"}</p>
                        <p className="text-xs text-muted">{l.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={l.success ? "green" : "red"} dot>
                      {l.success ? "Signed in" : "Wrong password"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">{deviceFromUA(l.userAgent)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{l.ip ?? "—"}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted" title={new Date(l.createdAt).toLocaleString("en-IN")}>
                    {timeAgo(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  );
}
