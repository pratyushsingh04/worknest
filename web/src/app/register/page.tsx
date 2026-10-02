"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import { AuthShell } from "@/components/auth-shell";
import { ProfileWhatFields, ProfileWhereFields, emptyProfile, missingForListing, toProfilePayload, type ProfileForm } from "@/components/company-profile";
import { easeOut } from "@/components/motion";
import { PasswordStrength } from "@/components/password-strength";
import { Button, Field, FormError, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

const steps = [
  { title: "Create your workspace", subtitle: "You'll be the admin. Three short steps and your company is live." },
  { title: "What does your company do?", subtitle: "This becomes your public profile. Clients read it before they hire you." },
  { title: "Where can clients find you?", subtitle: "Last step. Once this is filled in, clients can see your company." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [account, setAccount] = useState({ companyName: "", name: "", designation: "", email: "", password: "" });
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setA = (key: keyof typeof account) => (e: React.ChangeEvent<HTMLInputElement>) => setAccount({ ...account, [key]: e.target.value });
  const setP = (patch: Partial<ProfileForm>) => setProfile((p) => ({ ...p, ...patch }));

  function go(to: number) {
    setError(null);
    setDir(to > step ? 1 : -1);
    setStep(to);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      // Tags aren't native inputs, so the browser can't require them for us.
      if (!profile.specialities.length) return setError("Add at least one speciality.");
      if (!profile.offerings.length) return setError("Add at least one thing clients can hire you for.");
    }
    if (step < steps.length - 1) return go(step + 1);

    const missing = missingForListing(profile);
    if (missing.length) return setError(`Still needed: ${missing.join(", ")}.`);
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register-company", { ...account, designation: account.designation || undefined, profile: toProfilePayload(profile) });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={steps[step].title}
      subtitle={steps[step].subtitle}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
          <span className="mx-2 text-line">|</span>
          Looking to hire?{" "}
          <Link href="/register/client" className="font-medium text-brand hover:underline">
            Join as a client
          </Link>
        </>
      }
    >
      <ol className="mb-7 flex items-center gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {["Account", "What you do", "Where you are"].map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={clsx("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand text-white" : "bg-gray-100 text-muted")}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={clsx("hidden text-xs font-medium sm:block", i === step ? "text-ink" : "text-muted")}>{label}</span>
            {i < 2 && (
              <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <motion.span className="block h-full origin-left bg-emerald-500" animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.4, ease: easeOut }} />
              </span>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className={clsx("space-y-4", error && "mt-4")}
          >
            {step === 0 && (
              <>
                <Field label="Company name">
                  <Input required minLength={2} autoFocus value={account.companyName} onChange={setA("companyName")} placeholder="Acme Technologies" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name">
                    <Input required minLength={2} autoComplete="name" value={account.name} onChange={setA("name")} />
                  </Field>
                  <Field label="Your title">
                    <Input value={account.designation} onChange={setA("designation")} placeholder="Founder" />
                  </Field>
                </div>
                <Field label="Work email">
                  <Input type="email" required autoComplete="email" value={account.email} onChange={setA("email")} />
                </Field>
                <Field label="Password">
                  <Input type="password" required minLength={8} autoComplete="new-password" value={account.password} onChange={setA("password")} />
                </Field>
                <PasswordStrength password={account.password} />
              </>
            )}
            {step === 1 && <ProfileWhatFields form={profile} set={setP} />}
            {step === 2 && <ProfileWhereFields form={profile} set={setP} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={loading}>
            {step < steps.length - 1 ? "Continue" : "Create workspace"} <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
