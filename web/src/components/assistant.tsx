"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface Turn {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  /** The model was unavailable, so this answer came from the built-in templates. */
  basic?: boolean;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

const starters = {
  staff: ["What should I work on today?", "Which projects are behind?", "How much leave do I have left?"],
  lead: ["Who hasn't checked in today?", "Which projects are behind?", "Any client requests waiting on us?"],
  client: ["Where do my projects stand?", "Is anything waiting for my approval?", "Find a company that builds mobile apps"],
};

/**
 * Answers go straight to the API rather than through the web proxy, because a reply
 * can take longer than the proxy waits. A one-minute token stands in for the cookie.
 */
async function ask(messages: Turn[]): Promise<{ reply: string; basic: boolean }> {
  const { token } = await api.get<{ token: string }>("/auth/socket-token");
  const res = await fetch(`${API_ORIGIN}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
  });
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; mode?: "ai" | "basic" };
  if (!res.ok || !data.reply) throw new Error(data.error ?? "The assistant could not answer just now. Please try again.");
  return { reply: data.reply, basic: data.mode === "basic" };
}

/** Bold and short lists are all the assistant uses, so that is all this renders. */
function Rich({ text }: { text: string }) {
  const bold = (line: string): ReactNode[] => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={blocks.length} className="my-1.5 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{bold(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      list.push(item[1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{bold(line)}</p>);
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

/** The floating assistant. `tone` matches it to the workspace (light) or the client portal (dark). */
export function Assistant({ tone }: { tone: "light" | "dark" }) {
  const { user } = useAuth();
  const dark = tone === "dark";
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  // "basic" means no language model is configured and answers come from templates.
  const [mode, setMode] = useState<"ai" | "basic">("ai");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Ask the server whether the assistant is switched on the first time the panel opens.
  useEffect(() => {
    if (!open || enabled !== null) return;
    api.get<{ enabled: boolean; mode?: "ai" | "basic" }>("/assistant/status").then(
      (s) => {
        setEnabled(s.enabled);
        setMode(s.mode ?? "ai");
      },
      () => setEnabled(false),
    );
  }, [open, enabled]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, thinking]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    // A failed answer is dropped from what is sent, so the history stays question, answer, question.
    const history = [...turns.filter((t) => !t.failed), { role: "user" as const, content }];
    setTurns([...turns, { role: "user", content }]);
    setDraft("");
    setThinking(true);
    try {
      const { reply, basic } = await ask(history);
      setTurns((t) => [...t, { role: "assistant", content: reply, basic }]);
    } catch (err) {
      setTurns((t) => [...t.slice(0, -1), { role: "user", content, failed: true }, { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", failed: true }]);
    } finally {
      setThinking(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  const suggestions = user.role === "CLIENT" ? starters.client : user.role === "EMPLOYEE" ? starters.staff : starters.lead;
  const accent = dark ? "bg-emerald-400 text-night" : "bg-brand-gradient text-white";

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className={clsx("fixed right-5 z-40 flex h-13 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-[0_18px_40px_-12px_rgb(49_46_129_/_0.6)]", accent, dark ? "bottom-24 md:bottom-6" : "bottom-6")}
            aria-label="Open the assistant"
          >
            <Sparkles className="size-4" /> Ask WorkNest
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label="WorkNest assistant"
            style={{ transformPerspective: 1200, transformOrigin: "100% 100%" }}
            initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={clsx(
              "fixed right-3 z-50 flex h-[min(620px,calc(100vh-7rem))] w-[min(410px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl shadow-[0_40px_100px_-30px_rgb(0_0_0_/_0.55)] sm:right-5",
              dark ? "border-glow bottom-24 bg-night-2 text-white md:bottom-6" : "bottom-5 border border-line bg-surface text-ink",
            )}
          >
            <header className={clsx("flex items-center justify-between gap-3 px-5 py-4", dark ? "border-b border-white/10" : "border-b border-line")}>
              <div className="flex items-center gap-3">
                <span className={clsx("flex size-9 items-center justify-center rounded-xl", accent)}>
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Ask WorkNest</p>
                  <p className={clsx("text-xs", dark ? "text-white/45" : "text-muted")}>{mode === "basic" ? "Basic mode · answers from your live data" : "Answers from your live data. Read-only."}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className={clsx("rounded-full p-2 transition-colors", dark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-canvas hover:text-ink")} aria-label="Close the assistant">
                <X className="size-4" />
              </button>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scroll-thin">
              {enabled === false ? (
                <div className={clsx("rounded-2xl px-4 py-3 text-sm", dark ? "bg-amber-400/10 text-amber-200" : "bg-amber-50 text-amber-900")}>
                  The assistant isn&apos;t switched on for this server yet. It needs an AI API key added to the server&apos;s settings.
                </div>
              ) : turns.length === 0 ? (
                <div className="flex h-full flex-col justify-end gap-2">
                  <p className="text-lg font-semibold tracking-tight">Hi {user.name.split(" ")[0]}. What do you want to know?</p>
                  <p className={clsx("mb-2 text-sm", dark ? "text-white/50" : "text-muted")}>I can look up your projects, tasks, people and requests. I can&apos;t change anything.</p>
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      onClick={() => send(s)}
                      disabled={enabled !== true}
                      className={clsx("rounded-2xl px-4 py-3 text-left text-sm transition-colors disabled:opacity-50", dark ? "bg-white/[0.05] hover:bg-white/10" : "bg-canvas hover:bg-brand-soft")}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              ) : (
                turns.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={clsx("flex", t.role === "user" && "justify-end")}>
                    <div
                      className={clsx(
                        "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        t.role === "user" ? clsx("rounded-br-md", accent) : clsx("rounded-bl-md", t.failed ? (dark ? "bg-rose-500/10 text-rose-200" : "bg-red-50 text-red-700") : dark ? "bg-white/[0.06]" : "bg-canvas"),
                      )}
                    >
                      {t.role === "user" ? t.content : <Rich text={t.content} />}
                      {t.basic && mode === "ai" && <p className={clsx("mt-2 text-[11px]", dark ? "text-white/35" : "text-muted")}>The AI model was busy, so this is a basic answer.</p>}
                    </div>
                  </motion.div>
                ))
              )}
              {thinking && (
                <div className={clsx("flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3.5", dark ? "bg-white/[0.06]" : "bg-canvas")} role="status" aria-label="Looking that up">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className={clsx("size-1.5 rounded-full", dark ? "bg-emerald-300" : "bg-brand")} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className={clsx("flex items-end gap-2 p-3", dark ? "border-t border-white/10" : "border-t border-line")}>
              <textarea
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={1}
                maxLength={4000}
                disabled={enabled !== true}
                placeholder="Ask about your work…"
                aria-label="Your question"
                className={clsx(
                  "max-h-28 min-h-11 flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50",
                  dark ? "bg-white/[0.05] text-white placeholder:text-white/30 focus:bg-white/[0.08]" : "bg-canvas text-ink placeholder:text-muted/70 focus:ring-2 focus:ring-brand/20",
                )}
              />
              <button type="submit" disabled={!draft.trim() || thinking || enabled !== true} className={clsx("flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40", accent)} aria-label="Send">
                <ArrowUp className="size-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
