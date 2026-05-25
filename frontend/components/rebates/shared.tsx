"use client";

import type { EligibilityVerdict } from "@/lib/eligibility";

/* ---------- Step indicator ---------- */

export function StepBars({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 w-10 rounded-full transition ${
            i + 1 <= current ? "bg-[var(--ink)]" : "bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- Eligibility badge ---------- */

export function EligibilityBadge({ verdict }: { verdict: EligibilityVerdict }) {
  if (verdict.result === "eligible") {
    return (
      <Badge tone="emerald" icon={<CheckGlyph small />}>
        Eligible
      </Badge>
    );
  }
  if (verdict.result === "check-directly") {
    return (
      <Badge tone="amber" icon={<InfoGlyph small />}>
        Check directly
      </Badge>
    );
  }
  if (verdict.result === "closed") {
    return (
      <Badge tone="muted" icon={<XGlyph small />}>
        Closed
      </Badge>
    );
  }
  return (
    <Badge tone="muted" icon={<XGlyph small />}>
      Not eligible
    </Badge>
  );
}

type Tone = "emerald" | "amber" | "stone" | "muted";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-900",
  stone: "bg-stone-100 text-stone-700",
  muted: "bg-stone-100 text-stone-500",
};

export function Badge({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------- Radio dot ---------- */

export function Radio({
  selected,
  disabled,
}: {
  selected: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]"
          : "border-[var(--border)] bg-white"
      } ${disabled ? "opacity-50" : ""}`}
      aria-hidden
    >
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
  );
}

/* ---------- Learn more link ---------- */

export function LearnMore({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent-deep)]"
    >
      Learn more
      <svg
        viewBox="0 0 12 12"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 9L9 3M5 3h4v4" />
      </svg>
    </a>
  );
}

/* ---------- Glyphs ---------- */

export function CheckGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 9 : 12;
  return (
    <svg
      viewBox="0 0 16 16"
      width={s}
      height={s}
      fill="none"
      stroke={small ? "currentColor" : "white"}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function XGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 9 : 12;
  return (
    <svg
      viewBox="0 0 16 16"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function InfoGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 10 : 14;
  return (
    <svg
      viewBox="0 0 16 16"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.2v4M8 5.2v.01" strokeLinecap="round" />
    </svg>
  );
}
