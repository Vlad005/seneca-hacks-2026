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

export default function ConfirmPage() {
  const router = useRouter();
  const [bill, setBill] = useState<ExtractedBill | null>(null);
  const [monthly, setMonthly] = useState<number[]>([]);
  const [split, setSplit] = useState<UsageProfile["daily_split"]>({
    night: 0.25, morning: 0.25, day: 0.15, evening: 0.35,
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

  const monthLabels = CALENDAR_MONTH_LABELS as unknown as string[];

  const monthlyTotal = useMemo(
    () => monthly.reduce((a, b) => a + b, 0),
    [monthly],
  );
  const avgDailyKwh = monthlyTotal / 365;

  if (!hydrated || !bill) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
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
    router.push("/rebates");
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Does this match your usage?
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            We pulled these from your bill. Drag the bars or handles to match your real pattern.
          </p>
        </header>

        {/* Address card */}
        <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Your roof
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px]">
            <input
              type="text"
              value={bill.service_address ?? ""}
              onChange={(e) => updateAddressField("service_address", e.target.value || null)}
              placeholder="Street address"
              className={inputClasses}
            />
            <input
              type="text"
              value={bill.city ?? ""}
              onChange={(e) => updateAddressField("city", e.target.value || null)}
              placeholder="City"
              className={inputClasses}
            />
            <input
              type="text"
              value={bill.postal_code ?? ""}
              onChange={(e) => updateAddressField("postal_code", e.target.value || null)}
              placeholder="Postal"
              className={inputClasses}
            />
          </div>
        </section>

        {/* Monthly bars */}
        <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <MonthlyUsageChart
            values={monthly}
            labels={monthLabels}
            onChange={setMonthly}
          />
        </section>

        {/* Daily split */}
        <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <DailySplitChart
            split={split}
            dailyKwh={avgDailyKwh}
            onChange={setSplit}
          />
        </section>

        <div className="flex justify-between pt-2">
          <button
            onClick={() => router.push("/upload")}
            className="rounded-full px-5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            ← Re-upload
          </button>
          <button
            onClick={onContinue}
            className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            Looks right →
          </button>
        </div>
      </div>
    </main>
  );
}

const inputClasses =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-amber-900";
