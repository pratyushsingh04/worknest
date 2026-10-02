"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Building2, FolderKanban, Home, LogOut, Megaphone, UserRound } from "lucide-react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { CLoader, Face } from "@/components/client/ui";
import { LogoMark } from "@/components/logo";

const links = [
  { href: "/client", label: "Home", icon: Home, exact: true },
  { href: "/client/companies", label: "Companies", icon: Building2 },
  { href: "/client/projects", label: "My projects", icon: FolderKanban },
  { href: "/client/needs", label: "My needs", icon: Megaphone },
];

function useActive() {
  const pathname = usePathname();
  return (l: (typeof links)[number]) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`));
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-1 text-sm transition-colors hover:bg-white/10" aria-haspopup="menu" aria-expanded={open}>
        <Face name={user.name} size="sm" className="ring-0" />
        <span className="hidden max-w-32 truncate sm:block">{user.name.split(" ")[0]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="border-glow absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-night-2 p-1.5 shadow-2xl"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-white/45">{user.organisation ?? user.email}</p>
            </div>
            <Link href="/client/account" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">
              <UserRound className="size-4" /> Account
            </Link>
            <button onClick={logout} role="menuitem" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const isActive = useActive();
  // This interface is for clients; people inside a company use the workspace.
  const isStaff = user.role !== "CLIENT";
  useEffect(() => {
    if (isStaff) router.replace("/dashboard");
  }, [isStaff, router]);
  if (isStaff) return null;

  return (
    <>
      {/* Slow-moving light behind everything */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -top-56 left-[8%] size-[640px] rounded-full bg-[radial-gradient(circle,rgb(16_185_129_/_0.2),transparent_65%)]"
          animate={{ x: [0, 90, 0], y: [0, 50, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[30%] -right-48 size-[720px] rounded-full bg-[radial-gradient(circle,rgb(79_70_229_/_0.2),transparent_65%)]"
          animate={{ x: [0, -70, 0], y: [0, -60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-grid" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-night via-night/85 to-transparent px-4 pt-4 pb-8">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <Link href="/client" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <LogoMark />
            <span className="hidden sm:block">WorkNest</span>
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300 uppercase ring-1 ring-emerald-400/20">Client</span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-night/70 p-1.5 shadow-[0_20px_60px_-20px_rgb(0_0_0)] backdrop-blur-xl md:flex">
            {links.map((l) => {
              const active = isActive(l);
              return (
                <Link key={l.href} href={l.href} className={clsx("relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors", active ? "text-night" : "text-white/60 hover:text-white")}>
                  {active && <motion.span layoutId="client-nav" className="absolute inset-0 rounded-full bg-emerald-400" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <l.icon className="relative size-4" />
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <AccountMenu />
        </div>
      </header>

      <main className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-32 sm:px-6 md:pb-20">{children}</main>

      {/* Phone navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-3xl border border-white/10 bg-night/85 p-1.5 backdrop-blur-xl md:hidden">
        {links.map((l) => {
          const active = isActive(l);
          return (
            <Link key={l.href} href={l.href} className={clsx("relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium", active ? "text-night" : "text-white/55")}>
              {active && <motion.span layoutId="client-nav-mobile" className="absolute inset-0 rounded-2xl bg-emerald-400" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <l.icon className="relative size-5" />
              <span className="relative">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-night text-white">
      <AuthProvider fallback={<CLoader label="Opening your portal" />}>
        <Shell>{children}</Shell>
      </AuthProvider>
    </div>
  );
}
