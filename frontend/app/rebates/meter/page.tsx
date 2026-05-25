"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedBill } from "@/lib/types";
import { getRebateDraft, loadBill, saveRebates } from "@/lib/storage";
import {
    type EligibilityAnswers,
    type EligibilityVerdict,
    deriveAddressAnswers,
    resolveEligibility,
} from "@/lib/eligibility";
import {
    type MeterChoice,
    type RebateProgram,
    getProgram,
} from "@/data/rebate-programs";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import {
    EligibilityBadge,
    LearnMore,
    Radio,
    StepBars,
} from "@/components/rebates/shared";

const ORDERED: RebateProgram[] = [
    getProgram("net-metering")!,
    getProgram("hrs")!,
];

const HIGHLIGHTS: Record<MeterChoice, string[]> = {
    "net-metering": [
        "Bill credits at full retail rate",
        "Credits carry forward 12 months",
        "12 kW residential cap (May 2026)",
        "LDC connection approval + ESA inspection required",
    ],
    hrs: [
        "Up to $10,000 ($5K solar + $5K battery)",
        "Participating contractor required",
        "HRSP pre-approval and LDC approval before install",
    ],
};

export default function MeterChoicePage() {
    const router = useRouter();
    const [bill, setBill] = useState<ExtractedBill | null>(null);
    const [choice, setChoice] = useState<MeterChoice>("net-metering");
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const b = loadBill();
        if (!b) {
            router.replace("/upload");
            return;
        }
        setBill(b);
        const draft = getRebateDraft();
        setChoice(draft.meterChoice);
        setHydrated(true);
    }, [router]);

    const answers: EligibilityAnswers = useMemo(() => {
        const draft = getRebateDraft();
        return {
            isOwner: draft.isOwner,
            propertyType: draft.propertyType,
            incomeBracket: draft.incomeBracket,
            ownershipStructure: draft.ownershipStructure,
            ...deriveAddressAnswers(bill?.postal_code ?? null),
        };
    }, [hydrated, bill?.postal_code]);

    const verdicts = useMemo(() => {
        const m = new Map<string, EligibilityVerdict>();
        for (const p of ORDERED) m.set(p.id, resolveEligibility(p, answers));
        return m;
    }, [answers]);

    if (!hydrated || !bill) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-[var(--muted)]">Loading…</p>
            </div>
        );
    }

    const chosenVerdict = verdicts.get(choice);
    const canContinue = chosenVerdict?.result === "eligible";

    const onContinue = () => {
        if (!canContinue) return;
        const current = getRebateDraft();
        saveRebates({ ...current, meterChoice: choice });
        router.push("/rebates/extras");
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
                <Wordmark />
            </header>

            <main className="flex flex-1 flex-col items-center px-4 pb-16 sm:px-6">
                <div className="w-full max-w-3xl space-y-8">
                    <div>
                        <StepBars current={2} />
                        <h1 className="mt-5 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
                            Choose your solar program
                        </h1>
                        <p className="mt-3 max-w-xl text-[15px] text-[var(--muted)]">
                            These two are mutually exclusive — Net Metering pays
                            you over time in bill credits, HRS pays you upfront
                            as a rebate.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {ORDERED.map((p) => (
                            <MeterCard
                                key={p.id}
                                program={p}
                                verdict={verdicts.get(p.id)!}
                                selected={choice === p.id}
                                onSelect={() => {
                                    if (
                                        verdicts.get(p.id)?.result ===
                                        "eligible"
                                    ) {
                                        setChoice(p.id as MeterChoice);
                                    }
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button variant="ghost" href="/rebates/about-you">
                            Back
                        </Button>
                        <Button
                            arrow
                            onClick={onContinue}
                            disabled={!canContinue}
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MeterCard({
    program,
    verdict,
    selected,
    onSelect,
}: {
    program: RebateProgram;
    verdict: EligibilityVerdict;
    selected: boolean;
    onSelect: () => void;
}) {
    const disabled = verdict.result !== "eligible";
    const highlights = HIGHLIGHTS[program.id as MeterChoice] ?? [];

    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className={`group relative flex h-full flex-col gap-5 rounded-3xl border p-6 text-left transition disabled:cursor-not-allowed disabled:opacity-55 sm:p-7 ${
                selected
                    ? "border-[var(--accent)] bg-emerald-50/50"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted)]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <Radio selected={selected} disabled={disabled} />
                <EligibilityBadge verdict={verdict} />
            </div>

            <div>
                <div className="text-xs uppercase tracking-[0.1em] text-[var(--subtle)]">
                    {program.body}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.01em]">
                    {program.name}
                </div>
                {/* <div className="mt-4 text-[26px] font-semibold tabular-nums">
          {program.valueDisplay}
        </div> */}
                <div className="mt-2 text-sm text-[var(--muted)]">
                    {program.shortPitch}
                </div>
            </div>

            <ul className="mt-1 space-y-1.5">
                {highlights.map((h) => (
                    <li
                        key={h}
                        className="flex items-start gap-2 text-sm text-[var(--muted)]"
                    >
                        <span
                            aria-hidden
                            className="mt-1.5 inline-block h-1 w-1 rounded-full bg-[var(--accent)]"
                        />
                        {h}
                    </li>
                ))}
            </ul>

            {disabled && verdict.reason && (
                <p className="text-xs text-[var(--subtle)]">{verdict.reason}</p>
            )}

            <div className="mt-auto">
                <LearnMore url={program.url} />
            </div>
        </button>
    );
}
