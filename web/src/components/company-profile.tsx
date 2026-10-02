"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SIZE_RANGES, type CompanyProfile } from "@/lib/market-types";

export const ABOUT_MIN = 80;

export const INDUSTRIES = [
  "Software & IT services",
  "Design & creative",
  "Marketing & advertising",
  "Consulting",
  "Finance & accounting",
  "Legal services",
  "Architecture & engineering",
  "Media & production",
  "Education & training",
  "Healthcare services",
  "Construction & real estate",
  "Manufacturing",
  "Logistics",
  "Other",
];

/** The profile as form state: every field a string or list, so inputs stay controlled. */
export interface ProfileForm {
  tagline: string;
  about: string;
  industry: string;
  specialities: string[];
  offerings: string[];
  website: string;
  city: string;
  country: string;
  foundedYear: string;
  sizeRange: string;
  contactEmail: string;
}

export const emptyProfile: ProfileForm = { tagline: "", about: "", industry: "", specialities: [], offerings: [], website: "", city: "", country: "", foundedYear: "", sizeRange: "", contactEmail: "" };

export function toProfileForm(c: CompanyProfile): ProfileForm {
  return {
    tagline: c.tagline ?? "",
    about: c.about ?? "",
    industry: c.industry ?? "",
    specialities: c.specialities,
    offerings: c.offerings,
    website: c.website ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
    foundedYear: c.foundedYear?.toString() ?? "",
    sizeRange: c.sizeRange ?? "",
    contactEmail: c.contactEmail ?? "",
  };
}

/** What the API expects: empty strings become null. */
export function toProfilePayload(f: ProfileForm) {
  return {
    tagline: f.tagline.trim() || null,
    about: f.about.trim() || null,
    industry: f.industry || null,
    specialities: f.specialities,
    offerings: f.offerings,
    website: f.website.trim() || null,
    city: f.city.trim() || null,
    country: f.country.trim() || null,
    foundedYear: f.foundedYear ? Number(f.foundedYear) : null,
    sizeRange: f.sizeRange || null,
    contactEmail: f.contactEmail.trim() || null,
  };
}

/** Mirrors the server rule for appearing in the client directory. */
export function missingForListing(f: ProfileForm): string[] {
  const missing: string[] = [];
  if (f.tagline.trim().length < 10) missing.push("a one-line tagline");
  if (f.about.trim().length < ABOUT_MIN) missing.push(`an "about" of at least ${ABOUT_MIN} characters`);
  if (!f.industry) missing.push("your industry");
  if (!f.specialities.length) missing.push("at least one speciality");
  if (!f.offerings.length) missing.push("at least one thing clients can hire you for");
  if (!f.city.trim() || !f.country.trim()) missing.push("your city and country");
  return missing;
}

/** Type a value and press Enter (or comma) to add it as a tag. */
export function TagInput({ value, onChange, placeholder, max = 12 }: { value: string[]; onChange: (next: string[]) => void; placeholder: string; max?: number }) {
  const [draft, setDraft] = useState("");

  function add() {
    const tag = draft.trim().replace(/,+$/, "");
    if (tag.length >= 2 && value.length < max && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-2 transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
      <AnimatePresence initial={false}>
        {value.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-sm font-medium text-brand-dark"
          >
            {tag}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} className="rounded p-0.5 hover:bg-brand/10" aria-label={`Remove ${tag}`}>
              <X className="size-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        maxLength={60}
        placeholder={value.length ? "" : placeholder}
        className="min-w-32 flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
      />
    </div>
  );
}

type Setter = (patch: Partial<ProfileForm>) => void;

/** "What you do": the part of the profile clients read first. */
export function ProfileWhatFields({ form, set }: { form: ProfileForm; set: Setter }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Industry">
          <Select required value={form.industry} onChange={(e) => set({ industry: e.target.value })}>
            <option value="">Choose one</option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tagline" hint="One line clients see under your name">
          <Input required minLength={10} maxLength={140} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Product engineering for growing retailers" />
        </Field>
      </div>
      <Field label="About the company" hint={`What you do, who for, and what makes you good at it. ${form.about.trim().length}/${ABOUT_MIN} characters minimum.`}>
        <Textarea required minLength={ABOUT_MIN} maxLength={3000} rows={5} value={form.about} onChange={(e) => set({ about: e.target.value })} />
      </Field>
      <Field label="Specialities" hint="What you are known for. Press Enter after each one.">
        <TagInput value={form.specialities} onChange={(specialities) => set({ specialities })} placeholder="e.g. E-commerce, Mobile apps, Brand identity" />
      </Field>
      <Field label="What clients can hire you for" hint="The kinds of work you take on. Press Enter after each one.">
        <TagInput value={form.offerings} onChange={(offerings) => set({ offerings })} max={20} placeholder="e.g. Build a web app, Redesign a website, Monthly SEO" />
      </Field>
    </>
  );
}

/** "Where and how big": location, size and contact. */
export function ProfileWhereFields({ form, set }: { form: ProfileForm; set: Setter }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <Input required maxLength={80} value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Bengaluru" />
        </Field>
        <Field label="Country">
          <Input required maxLength={80} value={form.country} onChange={(e) => set({ country: e.target.value })} placeholder="India" />
        </Field>
        <Field label="Company size">
          <Select value={form.sizeRange} onChange={(e) => set({ sizeRange: e.target.value })}>
            <option value="">Prefer not to say</option>
            {SIZE_RANGES.map((s) => (
              <option key={s} value={s}>
                {s} people
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Founded in">
          <Input type="number" min={1800} max={2100} value={form.foundedYear} onChange={(e) => set({ foundedYear: e.target.value })} placeholder="2019" />
        </Field>
        <Field label="Website">
          <Input type="url" maxLength={200} value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://yourcompany.com" />
        </Field>
        <Field label="Contact email for clients">
          <Input type="email" value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} placeholder="hello@yourcompany.com" />
        </Field>
      </div>
    </>
  );
}
