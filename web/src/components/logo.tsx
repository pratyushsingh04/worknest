export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center rounded-xl bg-brand-gradient shadow-[inset_0_1px_0_rgb(255_255_255_/_0.25)] ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" aria-hidden>
        <path d="M3.5 6.5 7.2 18l4.8-9 4.8 9 3.7-11.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ className = "", dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${dark ? "text-white" : "text-ink"} ${className}`}>
      <LogoMark />
      WorkNest
    </span>
  );
}
