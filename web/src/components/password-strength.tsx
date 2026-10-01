"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

// Mirrors the server's password rules so people see them before submitting.
const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol (bonus)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const levels = ["bg-gray-200", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];

export function PasswordStrength({ password }: { password: string }) {
  const passed = rules.filter((r) => r.test(password)).length;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {rules.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <motion.div className={`h-full ${levels[passed]}`} initial={false} animate={{ width: i < passed ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {rules.map((r) => {
          const ok = r.test(password);
          return (
            <span key={r.label} className={`flex items-center gap-1 text-xs transition-colors ${ok ? "text-emerald-600" : "text-muted"}`}>
              <Check className={`size-3 transition-opacity ${ok ? "opacity-100" : "opacity-30"}`} /> {r.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
