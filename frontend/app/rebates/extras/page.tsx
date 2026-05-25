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
    REBATE_PROGRAMS,
    type MeterChoice,
    type RebateProgram,
} from "@/data/rebate-programs";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import {
    CheckGlyph,
    EligibilityBadge,
    LearnMore,
    StepBars,
} from "@/components/rebates/shared";

const stackablePrograms = REBATE_PROGRAMS.filter(
    (p) => p.id !== "hrs" && p.id !== "net-metering",
);

export default function ExtrasPage() {
    const router = useRouter();
    const [bill, setBill] = useState<ExtractedBill | null>(null);
    const [meterChoice, setMeterChoice] = useState<MeterChoice>("net-metering");
    const [includedExtras, setIncludedExtras] = useState<Set<string>>(
        new Set(),
    );
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const b = loadBill();
        if (!b) {
            router.replace("/upload");
            return;
        }
        setBill(b);
        const draft = getRebateDraft();
        setMeterChoice(draft.meterChoice);
        setIncludedExtras(new Set(draft.includedExtras));
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
        for (const p of stackablePrograms)
            m.set(p.id, resolveEligibility(p, answers));
        return m;
    }, [answers]);

    // Auto-uncheck any extras that became ineligible.
    useEffect(() => {
        setIncludedExtras((prev) => {
            const next = new Set<string>();
            for (const id of prev) {
                if (verdicts.get(id)?.result === "eligible") next.add(id);
            }
            return next.size === prev.size ? prev : next;
        });
    }, [verdicts]);

    const toggleExtra = (id: string) => {
        setIncludedExtras((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const includedCount = 1 + includedExtras.size; // meter choice always counts
    const combinedCap = useMemo(() => {
        let sum = 0;
        for (const id of [meterChoice, ...includedExtras]) {
            const p = REBATE_PROGRAMS.find((x) => x.id === id);
            if (p?.valueMaxCAD) sum += p.valueMaxCAD;
        }
        return sum;
    }, [meterChoice, includedExtras]);

    const onContinue = () => {
        const current = getRebateDraft();
        saveRebates({ ...current, includedExtras: Array.from(includedExtras) });
        router.push("/results");
    };

    if (!hydrated || !bill) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-[var(--muted)]">Loading…</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
                <Wordmark />
            </header>

            <main className="flex flex-1 flex-col items-center px-4 pb-20 sm:px-6">
                <div className="w-full max-w-3xl space-y-8">
                    <div>
                        <StepBars current={3} />
                        <h1 className="mt-5 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
                            Stack additional programs
                        </h1>
                        <p className="mt-3 max-w-xl text-[15px] text-[var(--muted)]">
                            These layer on top of your meter choice.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {stackablePrograms.map((p) => (
                            <ProgramCard
                                key={p.id}
                                program={p}
                                verdict={verdicts.get(p.id)!}
                                checked={includedExtras.has(p.id)}
                                onToggle={() => toggleExtra(p.id)}
                            />
                        ))}
                    </div>

                    <div className="sticky bottom-3 z-20 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 px-5 py-4 backdrop-blur">
                        <div className="flex items-center justify-between gap-4">
                            <Button variant="ghost" href="/rebates/meter">
                                Back
                            </Button>
                            <div className="flex items-center gap-4">
                                <div className="hidden text-right sm:block">
                                    <div className="text-sm font-medium">
                                        {includedCount} program
                                        {includedCount === 1 ? "" : "s"} in
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--subtle)]">
                                        {combinedCap > 0
                                            ? `Up to $${combinedCap.toLocaleString()}${meterChoice === "net-metering" ? " + export credits" : ""}`
                                            : meterChoice === "net-metering"
                                              ? "Plus lifetime export credits"
                                              : "—"}
                                    </div>
                                </div>
                                <Button arrow onClick={onContinue}>
                                    Crunch my numbers
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ProgramCard({
    program,
    verdict,
    checked,
    onToggle,
}: {
    program: RebateProgram;
    verdict: EligibilityVerdict;
    checked: boolean;
    onToggle: () => void;
}) {
    const eligible = verdict.result === "eligible";
    const advisory = verdict.result === "check-directly";
    const dim = !eligible && !advisory;

    return (
        <div
            className={`flex h-full flex-col rounded-3xl border p-6 transition ${
                dim
                    ? "border-[var(--border)] bg-stone-50/60"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted)]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs uppercase tracking-[0.1em] text-[var(--subtle)]">
                        {program.body}
                    </div>
                    <div
                        className={`mt-1 text-lg font-semibold ${dim ? "text-[var(--muted)]" : ""}`}
                    >
                        {program.name}
                    </div>
                </div>
                <EligibilityBadge verdict={verdict} />
            </div>

            <div
                className={`mt-4 text-xl font-semibold tabular-nums ${
                    dim ? "text-[var(--muted)]" : ""
                }`}
            >
                {program.valueDisplay}
            </div>
            <div
                className={`mt-1 text-sm ${
                    dim ? "text-[var(--subtle)]" : "text-[var(--muted)]"
                }`}
            >
                {program.shortPitch}
            </div>

            {program.note && eligible && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {program.note}
                </p>
            )}

            {dim && verdict.reason && (
                <p className="mt-3 text-xs text-[var(--subtle)]">
                    {verdict.reason}
                </p>
            )}

            {advisory && (
                <p className="mt-3 text-xs text-[var(--muted)]">
                    {program.advisoryNote ?? "Check directly."}
                </p>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                <LearnMore url={program.url} />
                {eligible && (
                    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={onToggle}
                            className="peer sr-only"
                        />
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--border)] bg-white peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40">
                            {checked && <CheckGlyph />}
                        </span>
                        <span className="font-medium">Include</span>
                    </label>
                )}
            </div>
        </div>
    );
}
