"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { Activity, BarChart3, KeyRound, Mail, ShieldCheck, Users } from "lucide-react";
import { EmailOutbox } from "@/components/admin/emails";
import { AuditLog, SignInLog } from "@/components/admin/logs";
import { Members } from "@/components/admin/members";
import { AdminOverview } from "@/components/admin/overview";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/ui";

const tabs = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "members", label: "Members & access", icon: Users },
  { key: "audit", label: "Audit log", icon: Activity },
  { key: "signins", label: "Sign-ins", icon: KeyRound },
  { key: "emails", label: "Emails", icon: Mail },
] as const;

type Tab = (typeof tabs)[number]["key"];

export default function AdminConsolePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user.role, router]);
  if (user.role !== "ADMIN") return null;

  return (
    <>
      <PageHeader icon={ShieldCheck} eyebrow="Administrator" title="Admin console" description={`Everything happening at ${user.company?.name}, in one place.`} />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-sm scroll-thin sm:inline-flex">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium">
            {tab === t.key && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-xl bg-brand-gradient shadow-md" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className={clsx("relative flex items-center gap-2", tab === t.key ? "text-white" : "text-muted hover:text-ink")}>
              <t.icon className="size-4" /> {t.label}
            </span>
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {tab === "overview" && <AdminOverview />}
        {tab === "members" && <Members />}
        {tab === "audit" && <AuditLog />}
        {tab === "signins" && <SignInLog />}
        {tab === "emails" && <EmailOutbox />}
      </motion.div>
    </>
  );
}
