"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Search, X } from "lucide-react";
import { CompanyCard } from "@/components/client/cards";
import { CEmpty, CErrorState, CLoader, Eyebrow, Headline, Panel } from "@/components/client/ui";
import { easeOut } from "@/components/motion";
import { useApi } from "@/lib/use-api";
import type { CompanyCard as Company } from "@/lib/market-types";

export default function CompaniesPage() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [speciality, setSpeciality] = useState<string | null>(null);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (speciality) params.set("speciality", speciality);
  const query = params.toString();
  const { data, error, reload } = useApi<{ companies: Company[]; specialities: string[]; total: number }>(`/market/companies${query ? `?${query}` : ""}`);

  return (
    <div>
      <section className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <Eyebrow icon={Building2}>{data ? `${data.total} ${data.total === 1 ? "company" : "companies"} on WorkNest` : "Company directory"}</Eyebrow>
        </div>
        <Headline className="mt-4">Find the company for your project.</Headline>
        <motion.p className="mx-auto mt-5 max-w-xl text-lg text-white/55" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: easeOut }}>
          Every company here runs its real work on WorkNest. Open one to see its teams, its people and what it has actually delivered.
        </motion.p>

        <motion.div className="relative mt-9" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.4, duration: 0.6, ease: easeOut }}>
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-white/35" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by name, skill, industry or city"
            aria-label="Search companies"
            className="h-16 w-full rounded-full border border-white/10 bg-white/[0.05] pr-14 pl-14 text-base text-white shadow-[0_30px_80px_-40px_rgb(52_211_153_/_0.5)] backdrop-blur transition-colors placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/10"
          />
          {input && (
            <button onClick={() => setInput("")} className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </motion.div>

        {data && data.specialities.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {data.specialities.map((s, i) => {
              const active = speciality === s;
              return (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.03 }}
                  onClick={() => setSpeciality(active ? null : s)}
                  aria-pressed={active}
                  className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ring-inset", active ? "bg-emerald-400 text-night ring-emerald-400" : "bg-white/[0.04] text-white/65 ring-white/10 hover:text-white")}
                >
                  {s}
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-14">
        {error ? (
          <CErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <CLoader label="Loading companies" />
        ) : data.companies.length === 0 ? (
          <Panel>
            <CEmpty
              icon={Search}
              title={data.total === 0 ? "No companies are listed yet" : "No company matches that"}
              text={data.total === 0 ? "Companies appear here once they complete their public profile." : "Try a broader word, or clear the filter to see everyone."}
            />
          </Panel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {data.companies.map((c, i) => (
                <motion.div
                  key={c.id}
                  layout
                  style={{ transformPerspective: 1200 }}
                  initial={{ opacity: 0, y: 30, rotateX: 12 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: easeOut }}
                  className="h-full"
                >
                  <CompanyCard company={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
