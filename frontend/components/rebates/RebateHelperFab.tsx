"use client";

import { useEffect, useState } from "react";

const SUGGESTIONS = [
    "Can I stack HRSP with HELP?",
    "What if I add a battery?",
    "Why am I not eligible for CGHAP?",
    "Net metering vs HRSP for my roof?",
];

export function RebateHelperFab() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Ask about rebates"
                className={`fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--background)] shadow-lg transition-[opacity,transform] duration-200 ease-out hover:scale-105 ${
                    open
                        ? "pointer-events-none scale-90 opacity-0"
                        : "scale-100 opacity-100"
                }`}
            >
                <SparkleGlyph size={22} />
            </button>

            <div
                className={`fixed inset-0 z-40 transition-opacity duration-200 ease-out ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setOpen(false)}
                aria-hidden
            />
            <div
                role="dialog"
                aria-label="Rebate Helper"
                aria-hidden={!open}
                className={`fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[calc(100vh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl transition-[opacity,transform] duration-200 ease-out ${
                    open
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-3 scale-95 opacity-0"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <SparkleGlyph size={16} />
                                    <h2 className="text-base font-semibold tracking-[-0.01em]">
                                        Rebate Helper
                                    </h2>
                                </div>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                    Ask anything about programs
                                </p>
                            </div>
                            <div className="-mt-1 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Minimize"
                                    className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                                >
                                    <MinusGlyph />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Close"
                                    className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                                >
                                    <CloseGlyph />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <div className="rounded-2xl bg-[var(--background)] px-4 py-3 text-sm">
                                <p>
                                    Hi! I can help you figure out which solar
                                    rebates apply to your property.
                                </p>
                                <p className="mt-2 text-[var(--muted)]">
                                    Try asking:
                                </p>
                            </div>

                            <div className="mt-3 space-y-2">
                                {SUGGESTIONS.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-left text-sm transition hover:border-[var(--muted)] hover:bg-[var(--background)]"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <footer className="border-t border-[var(--border)] px-5 py-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask a question..."
                                    className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm outline-none transition focus:border-[var(--muted)]"
                                />
                                <button
                                    type="button"
                                    aria-label="Send"
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--background)] transition hover:opacity-90"
                                >
                                    <ArrowGlyph />
                                </button>
                            </div>
                </footer>
            </div>
        </>
    );
}

function SparkleGlyph({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z" />
        </svg>
    );
}

function MinusGlyph() {
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
            <path d="M3 7h8" />
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

function ArrowGlyph() {
    return (
        <svg
            width="14"
            height="14"
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
