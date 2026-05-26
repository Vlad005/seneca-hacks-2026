"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, extractBill } from "@/lib/api";
import { clearDerivedFromBill, saveBill } from "@/lib/storage";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";

type Phase = "idle" | "selected" | "uploading" | "error";

const PROCESSING_STAGES = [
    "Reading your bill",
    "Pulling your address",
    "Looking up your usage",
    "Almost there",
];

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB = 10;

export default function UploadPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stageIdx, setStageIdx] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (phase !== "uploading") return;
        setStageIdx(0);
        const id = window.setInterval(() => {
            setStageIdx((i) => Math.min(i + 1, PROCESSING_STAGES.length - 1));
        }, 1800);
        return () => window.clearInterval(id);
    }, [phase]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const accept = (f: File) => {
        if (!ACCEPTED.includes(f.type)) {
            setError(`That format isn't supported. Use JPG, PNG, or WEBP.`);
            setPhase("error");
            return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            setError(
                `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Limit is ${MAX_MB} MB.`,
            );
            setPhase("error");
            return;
        }
        setError(null);
        setFile(f);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(f));
        setPhase("selected");
    };

    const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const f = e.target.files?.[0];
        if (f) accept(f);
    };

    const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) accept(f);
    };

    const submit = async () => {
        if (!file) return;
        setPhase("uploading");
        setError(null);
        try {
            const bill = await extractBill(file);
            // Fresh bill = fresh run. Wipe geocoded coords + analysis + cloud +
            // usage + rebate answers so they don't carry over from the prior home.
            clearDerivedFromBill();
            saveBill(bill);
            router.push("/confirm");
        } catch (e) {
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "Something went wrong reading the bill.";
            setError(msg);
            setPhase("error");
        }
    };

    const reset = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(null);
        setPreviewUrl(null);
        setError(null);
        setPhase("idle");
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-6 py-6 sm:px-10">
                <Wordmark />
            </header>

            <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:pt-8">
                <div className="w-full max-w-xl">
                    <h1 className="text-4xl font-semibold tracking-[-0.02em]">
                        Upload your bill
                    </h1>
                    <p className="mt-3 text-[15px] text-[var(--muted)]">
                        We&apos;ll pull your address and monthly usage. The
                        image stays in this session only.
                    </p>

                    <div className="mt-10">
                        {phase === "uploading" ? (
                            <ProcessingView
                                stage={PROCESSING_STAGES[stageIdx]}
                            />
                        ) : (
                            <DropZone
                                isDragging={isDragging}
                                previewUrl={previewUrl}
                                onClick={() => inputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                            />
                        )}

                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="hidden"
                            onChange={onPick}
                        />

                        {phase !== "uploading" && file && (
                            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                                <div className="min-w-0 truncate">
                                    <span className="font-medium">
                                        {file.name}
                                    </span>
                                    <span className="ml-2 text-[var(--subtle)]">
                                        {(file.size / 1024 / 1024).toFixed(1)}{" "}
                                        MB
                                    </span>
                                </div>
                                <button
                                    onClick={reset}
                                    className="ml-3 shrink-0 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        {phase !== "uploading" && error && (
                            <div className="mt-4 rounded-2xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                                {error}
                            </div>
                        )}

                        {phase !== "uploading" && (
                            <div className="mt-10 flex justify-between">
                                <Button variant="ghost" href="/">
                                    Cancel
                                </Button>
                                <Button arrow onClick={submit} disabled={!file}>
                                    Continue
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

interface DropZoneProps {
    isDragging: boolean;
    previewUrl: string | null;
    onClick: () => void;
    onDragOver: React.DragEventHandler<HTMLDivElement>;
    onDragLeave: () => void;
    onDrop: React.DragEventHandler<HTMLDivElement>;
}

function DropZone({
    isDragging,
    previewUrl,
    onClick,
    onDragOver,
    onDragLeave,
    onDrop,
}: DropZoneProps) {
    return (
        <div
            onClick={onClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border bg-[var(--card)] p-14 text-center transition ${
                isDragging
                    ? "border-[var(--accent)] bg-emerald-50/70 dark:bg-emerald-950/20"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
            }`}
        >
            {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={previewUrl}
                    alt="Bill preview"
                    className="max-h-72 rounded-xl object-contain"
                />
            ) : (
                <>
                    <UploadGlyph />
                    <div className="mt-3 text-[15px] font-medium text-[var(--foreground)]">
                        Drop your bill here
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                        or click to pick a file
                    </div>
                </>
            )}
        </div>
    );
}

function UploadGlyph() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--muted)]"
            aria-hidden
        >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M3 16l4-4a2 2 0 0 1 2.83 0L14 16" />
            <path d="M14 14l1.5-1.5a2 2 0 0 1 2.83 0L21 15" />
            <circle cx="16" cy="9" r="1.3" />
        </svg>
    );
}

function ProcessingView({ stage }: { stage: string }) {
    return (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-[var(--border)] bg-[var(--card)] px-8 py-20">
            <Spinner />
            <div className="text-center">
                <div className="text-[15px] font-medium">{stage}</div>
                <div className="mt-1 text-xs text-[var(--subtle)]">
                    Usually 3 to 8 seconds
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <svg
            viewBox="0 0 50 50"
            width="40"
            height="40"
            className="animate-spin text-[var(--muted)]"
            aria-hidden
        >
            <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="4"
            />
            <path
                d="M25 5 a20 20 0 0 1 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
            />
        </svg>
    );
}
