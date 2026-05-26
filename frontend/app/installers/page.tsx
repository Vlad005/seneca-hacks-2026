"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { INSTALLERS, type Installer } from "@/data/installers";
import {
    loadAnalysis,
    loadBill,
    loadCustomization,
    loadGeo,
    loadRebates,
} from "@/lib/storage";
import { REBATE_PROGRAMS } from "@/data/rebate-programs";

interface PropertySummary {
    address: string;
    systemKw: number | null;
    panelCount: number | null;
    annualKwh: number | null;
    programPath: string;
}

export default function InstallersPage() {
    const [showMore, setShowMore] = useState(false);
    const [modalInstaller, setModalInstaller] = useState<Installer | null>(
        null,
    );
    const [property, setProperty] = useState<PropertySummary>({
        address: "",
        systemKw: null,
        panelCount: null,
        annualKwh: null,
        programPath: "",
    });

    useEffect(() => {
        const bill = loadBill();
        const geo = loadGeo();
        const analysis = loadAnalysis();
        const customization = loadCustomization();
        const rebates = loadRebates();

        const address = geo?.query || bill?.service_address || "your property";

        const systemKw = analysis?.system_kw ?? null;
        const panelCount =
            customization?.panelCount ?? analysis?.panel_count ?? null;
        const annualKwh = analysis?.annual_kwh ?? null;

        const programPath = buildProgramPath(rebates);

        setProperty({
            address,
            systemKw,
            panelCount,
            annualKwh,
            programPath,
        });
    }, []);

    const visibleInstallers = useMemo(
        () => (showMore ? INSTALLERS : INSTALLERS.slice(0, 3)),
        [showMore],
    );
    const hiddenCount = INSTALLERS.length - 3;

    return (
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
            <BackLink />

            <PageHeader
                systemKw={property.systemKw}
                programPath={property.programPath}
                matchedCount={INSTALLERS.length}
            />

            <ul className="mt-8 space-y-3">
                {visibleInstallers.map((installer) => (
                    <li key={installer.id}>
                        <InstallerCard
                            installer={installer}
                            onRequestQuote={() => setModalInstaller(installer)}
                        />
                    </li>
                ))}
            </ul>

            {!showMore && hiddenCount > 0 && (
                <div className="mt-5 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowMore(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                        See {hiddenCount} more options
                        <ChevronGlyph />
                    </button>
                </div>
            )}

            <TrustFooter />

            {modalInstaller && (
                <QuoteModal
                    installer={modalInstaller}
                    property={property}
                    onClose={() => setModalInstaller(null)}
                />
            )}
        </main>
    );
}

/* -------------------------------- header ------------------------------- */

function BackLink() {
    return (
        <Link
            href="/results"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
            <svg
                viewBox="0 0 16 16"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
            >
                <path d="M13 8H3M7 4L3 8l4 4" />
            </svg>
            Back to results
        </Link>
    );
}

function PageHeader({
    systemKw,
    programPath,
    matchedCount,
}: {
    systemKw: number | null;
    programPath: string;
    matchedCount: number;
}) {
    const sizeLabel = systemKw ? `${systemKw.toFixed(1)} kW` : "your system";
    const programLabel = programPath || "your program selection";
    return (
        <section className="mt-8">
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                You&apos;re ready? Here&apos;s who can build it.
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--muted)]">
                Based on your location, system size, and program selection,
                we&apos;ve matched you with {matchedCount} ESA-certified
                installers that serve your area.
            </p>
        </section>
    );
}

/* ------------------------------ installer card -------------------------- */

function InstallerCard({
    installer,
    onRequestQuote,
}: {
    installer: Installer;
    onRequestQuote: () => void;
}) {
    const meta = [
        installer.coverage.split(",")[0].trim(),
        `${installer.yearsExperience} years`,
        installer.specialties[0],
    ];
    const trustSignals = [
        ...installer.certifications.slice(0, 2),
        `${installer.projectsCompleted} projects`,
    ].slice(0, 3);

    const cardBase = "rounded-2xl border p-5 sm:p-6 transition hover:shadow-sm";
    const cardCls = installer.topMatch
        ? `${cardBase} border-[var(--accent)] bg-emerald-50/40`
        : `${cardBase} border-[var(--border)] bg-[var(--card)]`;

    return (
        <article className={cardCls}>
            {installer.badge && (
                <div className="mb-3 flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] ${
                            installer.topMatch
                                ? "bg-[var(--accent-deep)] text-white"
                                : "bg-[var(--background)] text-[var(--muted)]"
                        }`}
                    >
                        {installer.topMatch && <StarGlyph />}
                        {installer.badge}
                    </span>
                </div>
            )}

            <h3 className="text-xl font-semibold tracking-[-0.01em]">
                {installer.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
                {installer.tagline}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {trustSignals.map((s) => (
                    <span
                        key={s}
                        className="inline-flex items-center gap-1.5 text-[var(--foreground)]"
                    >
                        <CheckGlyph />
                        {s}
                    </span>
                ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                <PinGlyph />
                <span>{meta[0]}</span>
                <span aria-hidden>·</span>
                <span>{meta[1]}</span>
                <span aria-hidden>·</span>
                <span>{meta[2]}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <a
                    href={installer.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                    Website
                    <ExternalGlyph />
                </a>
                <button
                    type="button"
                    onClick={onRequestQuote}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--background)] transition hover:opacity-90"
                >
                    Request quote
                    <ArrowGlyph />
                </button>
            </div>
        </article>
    );
}

/* --------------------------------- modal -------------------------------- */

function QuoteModal({
    installer,
    property,
    onClose,
}: {
    installer: Installer;
    property: PropertySummary;
    onClose: () => void;
}) {
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7"
            >
                {sent ? (
                    <SuccessView installer={installer} onClose={onClose} />
                ) : (
                    <RequestForm
                        installer={installer}
                        property={property}
                        onClose={onClose}
                        onSent={() => setSent(true)}
                    />
                )}
            </div>
        </div>
    );
}

function RequestForm({
    installer,
    property,
    onClose,
    onSent,
}: {
    installer: Installer;
    property: PropertySummary;
    onClose: () => void;
    onSent: () => void;
}) {
    return (
        <>
            <header className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-[-0.01em]">
                    Request a quote from {installer.name}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                >
                    <CloseGlyph />
                </button>
            </header>

            <p className="mt-3 text-sm text-[var(--muted)]">
                We&apos;ll share your property assessment with the installer so
                they can prepare an accurate quote.
            </p>

            <dl className="mt-5 space-y-1.5 rounded-2xl bg-[var(--background)] px-4 py-3 text-sm">
                <SummaryRow label="Property" value={property.address} />
                <SummaryRow
                    label="System size"
                    value={
                        property.systemKw
                            ? `${property.systemKw.toFixed(1)} kW${
                                  property.panelCount
                                      ? ` (${property.panelCount} panels)`
                                      : ""
                              }`
                            : "—"
                    }
                />
                <SummaryRow
                    label="Annual generation"
                    value={
                        property.annualKwh
                            ? `${Math.round(property.annualKwh).toLocaleString()} kWh`
                            : "—"
                    }
                />
                <SummaryRow
                    label="Program path"
                    value={property.programPath || "—"}
                />
            </dl>

            <form
                className="mt-5 space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSent();
                }}
            >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--subtle)]">
                    Your contact info
                </p>
                <FormInput label="Name" type="text" required />
                <FormInput label="Email" type="email" required />
                <FormInput label="Phone (optional)" type="tel" />

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
                    >
                        Send request
                        <ArrowGlyph />
                    </button>
                </div>
            </form>
        </>
    );
}

function SuccessView({
    installer,
    onClose,
}: {
    installer: Installer;
    onClose: () => void;
}) {
    return (
        <div className="text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[var(--accent-deep)]">
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">
                Request sent to {installer.name}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--muted)]">
                They&apos;ll reach out within 1–2 business days. We&apos;ve also
                emailed you a copy of your property assessment so you can
                compare quotes.
            </p>
            <div className="mt-6 flex justify-center">
                <Link
                    href="/results"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
                >
                    Back to dashboard
                </Link>
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--muted)]">{label}</dt>
            <dd className="text-right font-medium text-[var(--foreground)]">
                {value}
            </dd>
        </div>
    );
}

function FormInput({
    label,
    type,
    required,
}: {
    label: string;
    type: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="sr-only">{label}</span>
            <input
                type={type}
                required={required}
                placeholder={label}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2 text-[15px] outline-none transition focus:border-[var(--ink)]"
            />
        </label>
    );
}

/* --------------------------- trust footer ------------------------------ */

function TrustFooter() {
    return (
        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-[var(--subtle)]">
            All listed installers hold current ECRA/ESA electrical contractor
            licences, verified via the Electrical Safety Authority Contractor
            Locator. We don&apos;t take commission on installer matches —
            recommendations are based on coverage, certification, and
            specialization fit with your property profile.
        </p>
    );
}

/* ------------------------------- helpers ------------------------------- */

function buildProgramPath(rebates: ReturnType<typeof loadRebates>): string {
    if (!rebates) return "";
    const meterLabel = rebates.meterChoice === "hrs" ? "HRSP" : "Net metering";
    const extraLabels: string[] = [];
    for (const id of rebates.includedExtras ?? []) {
        const p = REBATE_PROGRAMS.find((x) => x.id === id);
        if (p) extraLabels.push(p.name);
    }
    if (extraLabels.length === 0) return meterLabel;
    return `${meterLabel} + ${extraLabels.join(", ")}`;
}

/* -------------------------------- glyphs ------------------------------- */

function CheckGlyph() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M2 7.5L5 10.5L12 3.5" />
        </svg>
    );
}

function StarGlyph() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="currentColor"
            aria-hidden
        >
            <path d="M6 0L7.5 4.2L12 4.5L8.6 7.3L9.7 11.5L6 9.1L2.3 11.5L3.4 7.3L0 4.5L4.5 4.2z" />
        </svg>
    );
}

function PinGlyph() {
    return (
        <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M5.5 9.5C5.5 9.5 9 6.5 9 4A3.5 3.5 0 0 0 2 4c0 2.5 3.5 5.5 3.5 5.5z" />
            <circle cx="5.5" cy="4" r="1.2" />
        </svg>
    );
}

function ChevronGlyph() {
    return (
        <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M2 4l3.5 3.5L9 4" />
        </svg>
    );
}

function ArrowGlyph() {
    return (
        <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
    );
}

function ExternalGlyph() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M4 2H2v8h8V8M7 2h3v3M5 7l5-5" />
        </svg>
    );
}

function CloseGlyph() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden
        >
            <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
    );
}
