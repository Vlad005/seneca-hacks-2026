import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          SolarFit — Ontario solar in 30 seconds
        </span>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Snap your hydro bill.
          <br />
          See what your roof can do.
        </h1>
        <p className="max-w-md text-balance text-base text-neutral-600 dark:text-neutral-300 sm:text-lg">
          We read your bill, find your roof on satellite, and run the real
          physics — including how shadows from your neighbours&apos; trees
          actually hit your panels.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/upload"
          className="rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          Snap your bill →
        </Link>
        <Link
          href="/sandbox"
          className="rounded-full border border-neutral-300 px-6 py-3 text-base font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          See the shadow demo
        </Link>
      </div>

      <p className="text-xs text-neutral-500">
        Works on phone (rear camera) or desktop (drag &amp; drop).
      </p>
    </main>
  );
}
