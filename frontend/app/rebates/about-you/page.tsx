"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedBill } from "@/lib/types";
import { getRebateDraft, loadBill, saveRebates } from "@/lib/storage";
import {
  type IncomeBracket,
  type OwnershipStructure,
  type PropertyType,
  isCornwallFromPostal,
  isTorontoPostal,
  provinceFromPostal,
} from "@/lib/eligibility";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import { StepBars } from "@/components/rebates/shared";

const PROPERTY_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "detached", label: "Detached" },
  { value: "semi", label: "Semi-detached" },
  { value: "row", label: "Row house" },
  { value: "townhome", label: "Townhome" },
  { value: "mobile_permanent", label: "Mobile (permanent foundation)" },
  { value: "condo", label: "Condo" },
  { value: "other", label: "Other" },
];

const INCOME_OPTIONS: { value: IncomeBracket; label: string }[] = [
  { value: "under_80k", label: "Under $80K" },
  { value: "over_80k", label: "$80K or more" },
  { value: "undisclosed", label: "Prefer not to say" },
];

const OWNERSHIP_OPTIONS: { value: OwnershipStructure; label: string }[] = [
  { value: "personal", label: "Personally" },
  { value: "corporation", label: "Through a corporation" },
];

export default function AboutYouPage() {
  const router = useRouter();
  const [bill, setBill] = useState<ExtractedBill | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [propertyType, setPropertyType] = useState<PropertyType>("detached");
  const [incomeBracket, setIncomeBracket] = useState<IncomeBracket>("over_80k");
  const [ownershipStructure, setOwnershipStructure] =
    useState<OwnershipStructure>("personal");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const b = loadBill();
    if (!b) {
      router.replace("/upload");
      return;
    }
    setBill(b);
    const draft = getRebateDraft();
    setIsOwner(draft.isOwner);
    setPropertyType(draft.propertyType);
    setIncomeBracket(draft.incomeBracket);
    setOwnershipStructure(draft.ownershipStructure);
    setHydrated(true);
  }, [router]);

  const province = useMemo(
    () => provinceFromPostal(bill?.postal_code),
    [bill?.postal_code],
  );
  const inToronto = useMemo(
    () => isTorontoPostal(bill?.postal_code),
    [bill?.postal_code],
  );
  const isCornwall = useMemo(
    () => isCornwallFromPostal(bill?.postal_code),
    [bill?.postal_code],
  );

  if (!hydrated || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  const addressLine = [bill.service_address, bill.city, bill.postal_code]
    .filter(Boolean)
    .join(", ");

  const onContinue = () => {
    const current = getRebateDraft();
    // If new answers make HRS ineligible (condo/other, non-owner, etc.), fall
    // back to Net Metering on the next screen.
    const hrsStillWorks =
      isOwner &&
      propertyType !== "condo" &&
      propertyType !== "other" &&
      province === "ON" &&
      !isCornwall;
    const meterChoice =
      current.meterChoice === "hrs" && !hrsStillWorks
        ? "net-metering"
        : current.meterChoice;
    saveRebates({
      ...current,
      isOwner,
      propertyType,
      incomeBracket,
      ownershipStructure,
      meterChoice,
    });
    router.push("/rebates/meter");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
        <Wordmark />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-16 sm:px-6">
        <div className="w-full max-w-3xl space-y-8">
          <div>
            <StepBars current={1} />
            <h1 className="mt-5 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
              Tell us about your home
            </h1>
            <p className="mt-3 text-[15px] text-[var(--muted)]">
              We use these to filter which programs you might actually qualify for.
            </p>
          </div>

          {province !== "ON" ? (
            <OutsideOntarioCard postal={bill.postal_code} />
          ) : (
            <>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7">
                <div className="space-y-5">
                  <SegmentedRow
                    label="Do you own this home?"
                    value={isOwner ? "yes" : "no"}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                    onChange={(v) => setIsOwner(v === "yes")}
                    minWidth={64}
                  />

                  <SelectRow
                    label="What kind of property?"
                    value={propertyType}
                    options={PROPERTY_OPTIONS}
                    onChange={setPropertyType}
                  />

                  <SegmentedRow<IncomeBracket>
                    label="Household income"
                    value={incomeBracket}
                    options={INCOME_OPTIONS}
                    onChange={setIncomeBracket}
                  />

                  <SegmentedRow<OwnershipStructure>
                    label="How is it owned?"
                    value={ownershipStructure}
                    options={OWNERSHIP_OPTIONS}
                    onChange={setOwnershipStructure}
                  />

                  <div className="flex flex-col items-start justify-between gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-xs uppercase tracking-[0.1em] text-[var(--subtle)]">
                        Address
                      </div>
                      <div className="mt-1 text-[15px]">{addressLine || "—"}</div>
                    </div>
                    <AddressTags
                      inToronto={inToronto}
                      isCornwall={isCornwall}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" href="/confirm">
                  Back
                </Button>
                <Button arrow onClick={onContinue}>
                  Continue
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function OutsideOntarioCard({ postal }: { postal: string | null }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">
        We&apos;re Ontario-only for now
      </h2>
      <p className="mt-3 text-[15px] text-[var(--muted)]">
        SolarFit&apos;s rebate engine is tuned to Ontario&apos;s incentive
        landscape (HRSP, OEB net metering, Save on Energy). The postal code on
        your bill{postal ? ` (${postal})` : ""} resolves to another province,
        so the program list wouldn&apos;t be honest.
      </p>
      <p className="mt-3 text-[15px] text-[var(--muted)]">
        We&apos;ll add more provinces as we vet their programs.
      </p>
      <div className="mt-6">
        <Button variant="ghost" href="/confirm">
          Back
        </Button>
      </div>
    </div>
  );
}

function AddressTags({
  inToronto,
  isCornwall,
}: {
  inToronto: boolean;
  isCornwall: boolean;
}) {
  if (isCornwall) {
    return <Tag tone="amber">Cornwall Electric (Hydro-Québec grid)</Tag>;
  }
  if (inToronto) {
    return <Tag tone="emerald">Within City of Toronto</Tag>;
  }
  return <Tag tone="stone">Outside City of Toronto</Tag>;
}

function Tag({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "stone";
  children: React.ReactNode;
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900"
        : "bg-stone-100 text-stone-600";
  return (
    <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {children}
    </div>
  );
}

function SegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
  minWidth,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  minWidth?: number;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
      <div className="text-[15px]">{label}</div>
      <div className="flex flex-wrap rounded-full border border-[var(--border)] p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={minWidth ? { minWidth } : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              value === o.value
                ? "bg-[var(--ink)] text-[var(--background)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
      <div className="text-[15px]">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-full border border-[var(--border)] bg-transparent px-3.5 py-1.5 text-sm font-medium outline-none focus:border-[var(--ink)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
