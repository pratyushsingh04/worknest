"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Badge, Button, Card, EmptyState, Spinner, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import type { Comment } from "@/lib/types";

/** Shared thread between the delivery team and the client, updated live. */
export function Discussion({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ comments: Comment[] }>(`/projects/${projectId}/comments`).then((r) => setComments(r.comments));
    const socket = getSocket();
    const onNew = (c: Comment & { projectId?: string }) => {
      if (c.projectId && c.projectId !== projectId) return;
      setComments((prev) => (prev && !prev.some((x) => x.id === c.id) ? [...prev, c] : prev));
    };
    socket.on("comment:new", onNew);
    return () => {
      socket.off("comment:new", onNew);
    };
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments?.length]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const { comment } = await api.post<{ comment: Comment }>(`/projects/${projectId}/comments`, { body });
      setComments((prev) => (prev && !prev.some((x) => x.id === comment.id) ? [...prev, comment] : prev));
      setBody("");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <div className="max-h-[480px] overflow-y-auto scroll-thin">
        {!comments ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState title="No messages yet" description="Questions, feedback and decisions: keep them here so everyone stays in the loop." />
        ) : (
          <ul className="space-y-4 p-5">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.author.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{c.author.name}</span>
                    {c.author.role === "CLIENT" && <Badge tone="purple">Client</Badge>}
                    <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink/85">{c.body}</p>
                </div>
              </li>
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line p-4">
        <Textarea
          className="min-h-10 flex-1"
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder={user.role === "CLIENT" ? "Message the team…" : "Message the team and client…"}
        />
        <Button type="submit" loading={sending}>
          Send
        </Button>
      </form>
    </Card>
  );
}
