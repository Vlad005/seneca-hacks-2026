"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedBill, UsageProfile } from "@/lib/types";
import { loadBill, saveBill, saveUsage } from "@/lib/storage";
import {
    CALENDAR_MONTH_LABELS,
    initialDailySplit,
    initialMonthly,
} from "@/lib/usage-defaults";
import { MonthlyUsageChart } from "@/components/MonthlyUsageChart";
import { DailySplitChart } from "@/components/DailySplitChart";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";

export default function ConfirmPage() {
    const router = useRouter();
    const [bill, setBill] = useState<ExtractedBill | null>(null);
    const [monthly, setMonthly] = useState<number[]>([]);
    const [split, setSplit] = useState<UsageProfile["daily_split"]>({
        night: 0.25,
        morning: 0.25,
        day: 0.15,
        evening: 0.35,
    });
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = loadBill();
        if (!stored) {
            router.replace("/upload");
            return;
        }
        setBill(stored);
        setMonthly(initialMonthly(stored));
        setSplit(initialDailySplit(stored));
        setHydrated(true);
    }, [router]);

    const monthLabels = useMemo(
        () => CALENDAR_MONTH_LABELS as unknown as string[],
        [],
    );

    const monthlyTotal = useMemo(
        () => monthly.reduce((a, b) => a + b, 0),
        [monthly],
    );
    const avgDailyKwh = monthlyTotal / 365;

    if (!hydrated || !bill) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-[var(--muted)]">Loading…</p>
            </div>
        );
    }

    const updateAddressField = <K extends keyof ExtractedBill>(
        key: K,
        value: ExtractedBill[K],
    ) => {
        setBill((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const onContinue = () => {
        if (!bill) return;
        saveBill(bill);
        saveUsage({ monthly_kwh: monthly, daily_split: split });
        router.push("/rebates/about-you");
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-6 py-6 sm:px-10">
                <Wordmark />
            </header>

            <main className="flex flex-1 flex-col items-center px-4 pb-16 sm:px-6">
                <div className="w-full max-w-3xl space-y-12">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-[-0.02em]">
                            Make this match your home
                        </h1>
                        <p className="mt-3 max-w-xl text-[15px] text-[var(--muted)]">
                            We pulled these from your bill. Adjust anything that
                            doesn&apos;t match — the simulation runs on these
                            numbers.
                        </p>
                    </div>

                    <Section title="Address" hint="Where we'll model the roof.">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_140px]">
                            <input
                                type="text"
                                value={bill.service_address ?? ""}
                                onChange={(e) =>
                                    updateAddressField(
                                        "service_address",
                                        e.target.value || null,
                                    )
                                }
                                placeholder="Street address"
                                className={inputClasses}
                            />
                            <input
                                type="text"
                                value={bill.city ?? ""}
                                onChange={(e) =>
                                    updateAddressField(
                                        "city",
                                        e.target.value || null,
                                    )
                                }
                                placeholder="City"
                                className={inputClasses}
                            />
                            <input
                                type="text"
                                value={bill.postal_code ?? ""}
                                onChange={(e) =>
                                    updateAddressField(
                                        "postal_code",
                                        e.target.value || null,
                                    )
                                }
                                placeholder="Postal"
                                className={inputClasses}
                            />
                        </div>
                    </Section>

                    <Section title="Monthly usage">
                        <MonthlyUsageChart
                            values={monthly}
                            labels={monthLabels}
                            onChange={setMonthly}
                        />
                    </Section>

                    <Section title="When you use power">
                        <DailySplitChart
                            split={split}
                            dailyKwh={avgDailyKwh}
                            onChange={setSplit}
                        />
                    </Section>

                    <div className="flex justify-between pt-2">
                        <Button variant="ghost" href="/upload">
                            Re-upload
                        </Button>
                        <Button arrow onClick={onContinue}>
                            Looks right
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Section({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
            <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold tracking-[-0.01em]">
                    {title}
                </h2>
                {hint && <p className="text-xs text-[var(--subtle)]">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

const inputClasses =
    "w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--ink)] placeholder:text-[var(--subtle)]";
