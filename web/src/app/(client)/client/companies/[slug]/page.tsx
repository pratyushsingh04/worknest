"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Award, BadgeCheck, CalendarDays, Check, Clock, Crown, Globe, Mail, MapPin, Send, Sparkles, UsersRound } from "lucide-react";
import { CButton, CEmpty, CError, CErrorState, CField, CInput, CLoader, CModal, CSelect, CTextarea, Chip, Eyebrow, Face, FaceStack, Monogram, Panel, Ring, Rise, SectionHead, Tilt, projectChip, requestChip, teamTint } from "@/components/client/ui";
import { CountUp, easeOut } from "@/components/motion";
import { useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, todayYmd } from "@/lib/format";
import { formatINR } from "@/lib/team-colors";
import { useApi } from "@/lib/use-api";
import type { CompanyPage, ShowcaseTeam } from "@/lib/market-types";
import type { TeamService } from "@/lib/types";

type Asking = { team: ShowcaseTeam; service: TeamService | null };

export default function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, loading, reload } = useApi<CompanyPage>(`/market/companies/${slug}`);
  const [asking, setAsking] = useState<Asking | null>(null);

  // People grouped the way the company groups them: by department.
  const departments = useMemo(() => {
    const groups = new Map<string, CompanyPage["people"]>();
    for (const p of data?.people ?? []) {
      const key = p.department || "Team";
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [data]);

  if (loading) return <CLoader label="Opening company" />;
  if (error || !data) return <CErrorState message={error ?? "Company not found"} onRetry={reload} />;

  const { company: c, teams, trackRecord, mine } = data;
  const record = [
    { value: trackRecord.delivered, label: "projects delivered" },
    { value: trackRecord.active, label: "in delivery now" },
    { value: trackRecord.clients, label: "clients served" },
    { value: trackRecord.people, label: "people" },
  ];

  return (
    <div className="space-y-16">
      <Link href="/client/companies" className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="size-4" /> All companies
      </Link>

      {/* Identity */}
      <section className="-mt-8 grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <motion.div className="flex items-center gap-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
            <motion.div initial={{ rotateY: -180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 1, ease: easeOut }} style={{ transformPerspective: 800 }}>
              <Monogram name={c.name} size="xl" />
            </motion.div>
            <div className="min-w-0">
              <Chip tone="emerald" icon={BadgeCheck}>
                Listed on WorkNest
              </Chip>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{c.name}</h1>
            </div>
          </motion.div>
          <motion.p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/75" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: easeOut }}>
            {c.tagline}
          </motion.p>
          <motion.div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" /> {[c.city, c.country].filter(Boolean).join(", ")}
            </span>
            {c.industry && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-4" /> {c.industry}
              </span>
            )}
            {c.foundedYear && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Since {c.foundedYear}
              </span>
            )}
            {c.sizeRange && (
              <span className="flex items-center gap-1.5">
                <UsersRound className="size-4" /> {c.sizeRange} people
              </span>
            )}
            {c.website && (
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-emerald-300">
                <Globe className="size-4" /> {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {c.contactEmail && (
              <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-1.5 hover:text-emerald-300">
                <Mail className="size-4" /> {c.contactEmail}
              </a>
            )}
          </motion.div>
          <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6, ease: easeOut }}>
            {teams.length > 0 && (
              <a href="#teams" className="inline-flex h-13 items-center gap-2 rounded-full bg-emerald-400 px-7 font-medium text-night shadow-[0_10px_30px_-12px_rgb(52_211_153_/_0.8)] transition-colors hover:bg-emerald-300">
                Start a project <ArrowRight className="size-4" />
              </a>
            )}
          </motion.div>
        </div>

        {/* Track record */}
        <Rise delay={0.2}>
          <Tilt max={5}>
            <Panel className="p-6">
              <p className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Award className="size-4 text-emerald-300" /> Track record
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {record.map((r) => (
                  <div key={r.label} className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">
                      <CountUp value={r.value} />
                    </p>
                    <p className="mt-1 text-xs text-white/45">{r.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/35">Counted from the company&apos;s own projects on WorkNest. Nobody can edit these numbers.</p>
            </Panel>
          </Tilt>
        </Rise>
      </section>

      {/* Your work with them */}
      {(mine.projects.length > 0 || mine.requests.length > 0) && (
        <Rise>
          <Panel className="p-6 ring-1 ring-emerald-400/20">
            <Eyebrow>Your work with {c.name}</Eyebrow>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {mine.projects.map((p) => (
                <Link key={p.id} href={`/client/projects/${p.id}`} className="group flex items-center gap-4 rounded-2xl bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]">
                  <Ring percent={p.progress.percent} size={60} stroke={6} color={p.team ? teamTint[p.team.color].stroke : undefined}>
                    <span className="text-xs font-semibold tabular-nums">{p.progress.percent}%</span>
                  </Ring>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-white/45">
                      <Chip tone={projectChip[p.status].tone}>{projectChip[p.status].label}</Chip>
                      {p.team && <span className="truncate">{p.team.name} team</span>}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-emerald-300" />
                </Link>
              ))}
              {mine.requests.map((r) => (
                <Link key={r.id} href="/client/projects#requests" className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="mt-0.5 block text-xs text-white/45">Request to the {r.team.name} team</span>
                  </span>
                  <Chip tone={requestChip[r.status].tone}>{requestChip[r.status].label}</Chip>
                </Link>
              ))}
            </div>
          </Panel>
        </Rise>
      )}

      {/* About */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Rise>
          <Panel className="h-full p-7">
            <Eyebrow>About</Eyebrow>
            <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-white/75">{c.about}</p>
          </Panel>
        </Rise>
        <div className="space-y-5">
          <Rise delay={0.08}>
            <Panel className="p-7">
              <Eyebrow>Known for</Eyebrow>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.specialities.map((s, i) => (
                  <motion.span key={s} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 18 }}>
                    <Chip tone="emerald" className="!px-3 !py-1.5 !text-sm">
                      {s}
                    </Chip>
                  </motion.span>
                ))}
              </div>
            </Panel>
          </Rise>
          <Rise delay={0.14}>
            <Panel className="p-7">
              <Eyebrow>You can hire them to</Eyebrow>
              <ul className="mt-4 space-y-2.5">
                {c.offerings.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-sm text-white/75">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                      <Check className="size-3 text-emerald-300" />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </Panel>
          </Rise>
        </div>
      </section>

      {/* Teams */}
      <section id="teams" className="scroll-mt-28">
        <SectionHead title="Teams and what they offer" hint="Each team has a lead who answers for the work. Ask a team directly for one of its services, or describe something of your own." />
        {teams.length === 0 ? (
          <Panel>
            <CEmpty icon={UsersRound} title="No client-facing teams yet" text={`${c.name} hasn't published its teams. You can still reach them at the contact above.`} />
          </Panel>
        ) : (
          <div className="space-y-5">
            {teams.map((t, i) => {
              const tint = teamTint[t.color];
              const names = [...new Set([...(t.lead ? [t.lead.name] : []), ...t.members.map((m) => m.user.name)])];
              return (
                <Rise key={t.id} delay={i * 0.05}>
                  <Panel glow className="p-6 sm:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className={`flex items-center gap-2 text-sm font-semibold ${tint.text}`}>
                          <span className={`size-2.5 rounded-full ${tint.dot}`} /> {t.name} team
                        </p>
                        {t.tagline && <p className="mt-2 text-xl font-semibold tracking-tight">{t.tagline}</p>}
                        {t.description && <p className="mt-2 max-w-2xl text-sm whitespace-pre-line text-white/55">{t.description}</p>}
                        {t.skills.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {t.skills.map((s) => (
                              <Chip key={s}>{s}</Chip>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 lg:w-72">
                        {t.lead && (
                          <div className="flex items-center gap-3">
                            <Face name={t.lead.name} className="ring-0" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                {t.lead.name} <Crown className="size-3.5 text-amber-300" />
                              </p>
                              <p className="truncate text-xs text-white/45">{t.lead.designation ?? "Team lead"}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <FaceStack names={names} max={6} />
                          <span className="text-xs text-white/45">
                            {names.length} {names.length === 1 ? "person" : "people"}
                          </span>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-white/45">
                          <Award className="size-3.5 text-emerald-300" /> {t.projectsDelivered} {t.projectsDelivered === 1 ? "project" : "projects"} delivered
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {t.services.map((s) => (
                        <div key={s.id} className="flex flex-col rounded-2xl border border-white/10 bg-night/40 p-5 transition-colors hover:border-white/20">
                          <h4 className="font-semibold">{s.title}</h4>
                          <p className="mt-1.5 line-clamp-3 text-sm text-white/55">{s.description}</p>
                          {s.deliverables.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {s.deliverables.slice(0, 4).map((d) => (
                                <li key={d} className="flex items-start gap-2 text-xs text-white/60">
                                  <Check className={`mt-0.5 size-3 shrink-0 ${tint.text}`} /> {d}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                            <div className="text-xs text-white/45">
                              {s.startingPrice != null && <p className="text-sm font-semibold text-white">From {formatINR(s.startingPrice)}</p>}
                              {s.turnaround && (
                                <p className="flex items-center gap-1">
                                  <Clock className="size-3" /> {s.turnaround}
                                </p>
                              )}
                            </div>
                            <CButton size="sm" onClick={() => setAsking({ team: t, service: s })}>
                              Request <ArrowRight className="size-3.5" />
                            </CButton>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setAsking({ team: t, service: null })} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55 transition-colors hover:border-emerald-400/50 hover:text-emerald-300">
                        <Send className="size-5" />
                        <span className="font-medium">Something else in mind?</span>
                        <span className="text-xs text-white/40">Describe it to the {t.name} team</span>
                      </button>
                    </div>
                  </Panel>
                </Rise>
              );
            })}
          </div>
        )}
      </section>

      {/* People */}
      <section>
        <SectionHead title={`The people at ${c.name}`} hint="Everyone who works here, by department. These are the company's real accounts." />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {departments.map(([dept, people], i) => (
            <Rise key={dept} delay={i * 0.05} className="h-full">
              <Panel className="h-full p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{dept}</h3>
                  <span className="text-xs text-white/40">
                    {people.length} {people.length === 1 ? "person" : "people"}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <Face name={p.name} className="ring-0" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {p.name} {p.isLeadership && <Crown className="size-3.5 shrink-0 text-amber-300" />}
                        </p>
                        <p className="truncate text-xs text-white/45">{p.designation ?? "Team member"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </Rise>
          ))}
        </div>
      </section>

      {asking && <RequestModal key={`${asking.team.id}-${asking.service?.id ?? "custom"}`} companyName={c.name} asking={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

function RequestModal({ companyName, asking, onClose }: { companyName: string; asking: Asking; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { team } = asking;
  const [serviceId, setServiceId] = useState(asking.service?.id ?? "");
  const [form, setForm] = useState({ title: asking.service?.title ?? "", details: "", budget: "", deadline: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/requests", { teamId: team.id, serviceId: serviceId || null, title: form.title, details: form.details, budget: form.budget || null, deadline: form.deadline || null });
      toast(`Request sent to ${companyName}`);
      router.push("/client/projects#requests");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <CModal open onClose={onClose} title={`Ask the ${team.name} team`} subtitle={`${companyName}${team.lead ? ` · goes to ${team.lead.name}` : ""}`} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <CError message={error} />
        {team.services.length > 0 && (
          <CField label="Service">
            <CSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Something else</option>
              {team.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </CSelect>
          </CField>
        )}
        <CField label="What do you need?">
          <CInput required minLength={3} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A booking website for our clinics" />
        </CField>
        <CField label="Details" hint="What it should do, who it is for and anything they should know before they reply.">
          <CTextarea required minLength={10} maxLength={4000} rows={6} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </CField>
        <div className="grid gap-4 sm:grid-cols-2">
          <CField label="Budget" hint="Optional">
            <CInput maxLength={60} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="₹2-3 lakh" />
          </CField>
          <CField label="Needed by" hint="Optional">
            <CInput type="date" min={todayYmd()} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </CField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <CButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="submit" loading={saving}>
            <Send className="size-4" /> Send request
          </CButton>
        </div>
        {form.deadline && <p className="text-right text-xs text-white/35">Needed by {formatDate(form.deadline)}</p>}
      </form>
    </CModal>
  );
}
