"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, CalendarClock, CalendarDays, CheckSquare, FolderKanban, Globe2, Inbox, LayoutDashboard, LogOut, Megaphone, Menu, Settings, ShieldCheck, Users, UsersRound, X } from "lucide-react";
import { Assistant } from "@/components/assistant";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui";
import { roleLabel } from "@/lib/format";
import type { Role } from "@/lib/types";

const STAFF: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
const EVERYONE = STAFF;
const LEADS: Role[] = ["ADMIN", "MANAGER"];

const sections = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: EVERYONE },
      { href: "/projects", label: "Projects", icon: FolderKanban, roles: EVERYONE },
      { href: "/my-tasks", label: "My tasks", icon: CheckSquare, roles: STAFF },
      { href: "/teams", label: "Teams", icon: UsersRound, roles: EVERYONE },
      { href: "/requests", label: "Requests", icon: Inbox, roles: LEADS },
      { href: "/leads", label: "Client needs", icon: Megaphone, roles: LEADS },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/attendance", label: "Attendance", icon: CalendarClock, roles: STAFF },
      { href: "/leaves", label: "Leave", icon: CalendarDays, roles: STAFF },
      { href: "/people", label: "People", icon: Users, roles: LEADS },
      { href: "/clients", label: "Clients", icon: Briefcase, roles: LEADS },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin", label: "Admin console", icon: ShieldCheck, roles: ["ADMIN"] as Role[] },
      { href: "/settings", label: "Settings", icon: Settings, roles: EVERYONE },
    ],
  },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const extra = user.isPlatformAdmin ? [{ label: "Platform", items: [{ href: "/platform", label: "All companies", icon: Globe2, roles: EVERYONE }] }] : [];

  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-white/5 bg-night text-white">

      <div className="relative flex h-16 items-center justify-between px-5">
        <Logo dark />
        {onNavigate && (
          <button className="rounded-md p-1 text-white/60 lg:hidden" onClick={onNavigate} aria-label="Close menu">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="relative mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="truncate text-sm font-medium">{user.company?.name}</p>
        <p className="text-xs text-white/50">{roleLabel[user.role]} workspace</p>
      </div>

      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-2 scroll-thin">
        {[...sections, ...extra].map((section) => {
          const items = section.items.filter((i) => i.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-white/35 uppercase">{section.label}</p>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      className={clsx("relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "text-white" : "text-white/55 hover:text-white")}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-xl bg-white/[0.08] ring-1 ring-white/10 ring-inset"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      {active && <motion.span layoutId="nav-marker" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-indigo-400" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                      <Icon className={clsx("relative size-4", active && "text-indigo-300")} />
                      <span className="relative">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="relative">
            <Avatar name={user.name} />
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-night bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-white/50">{user.designation ?? roleLabel[user.role]}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  // Clients have their own interface; the workspace is for people inside a company.
  const isClient = user.role === "CLIENT";
  useEffect(() => {
    if (isClient) router.replace("/client");
  }, [isClient, router]);
  if (isClient) return null;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-64"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <div className="relative lg:pl-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-light" />
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Logo />
        </header>
        <main className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        <Assistant tone="light" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
