"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, extractBill } from "@/lib/api";
import { saveBill } from "@/lib/storage";

type Phase = "idle" | "selected" | "uploading" | "error";

const PROCESSING_STAGES = [
  "Reading your bill…",
  "Pulling your address…",
  "Looking up your usage…",
  "Almost there…",
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

  // Rotate processing-stage copy while the request is in flight.
  useEffect(() => {
    if (phase !== "uploading") return;
    setStageIdx(0);
    const id = window.setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, PROCESSING_STAGES.length - 1));
    }, 1800);
    return () => window.clearInterval(id);
  }, [phase]);

  // Tidy up object URL on unmount or when file changes.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const accept = (f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      setError(`Unsupported file type ${f.type || "(unknown)"}. Use JPG, PNG, or WEBP.`);
      setPhase("error");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Limit is ${MAX_MB} MB.`);
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
      saveBill(bill);
      router.push("/confirm");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `Server returned ${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : "Unknown error";
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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">
          Upload your bill
        </h1>
        <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-300">
          JPG, PNG, or WEBP. We&apos;ll read the address and usage and never store the image.
        </p>

        {phase === "uploading" ? (
          <ProcessingView stage={PROCESSING_STAGES[stageIdx]} />
        ) : (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition ${
                isDragging
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
              }`}
            >
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Bill preview"
                  className="max-h-72 rounded-lg object-contain"
                />
              ) : (
                <>
                  <div className="text-4xl">📷</div>
                  <div className="text-base font-medium">
                    Drop your bill photo here
                  </div>
                  <div className="text-sm text-neutral-500">
                    or click to pick a file
                  </div>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />

            {file && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="truncate">
                  <span className="font-medium">{file.name}</span>{" "}
                  <span className="text-neutral-500">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <button
                  onClick={reset}
                  className="ml-3 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Remove
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => router.push("/")}
                className="rounded-full px-5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!file}
                className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
              >
                Process bill →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ProcessingView({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-neutral-200 px-8 py-16 dark:border-neutral-800">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500"
        aria-hidden
      />
      <div className="text-center">
        <div className="mb-1 text-lg font-medium">{stage}</div>
        <div className="text-xs text-neutral-500">
          Textract + GPT-4o-mini · usually 3–8 seconds
        </div>
      </div>
    </div>
  );
}
