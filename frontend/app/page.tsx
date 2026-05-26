import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
                <Wordmark />
            </header>

            <main className="flex flex-1 flex-col px-5 pb-12 sm:px-10">
                <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-12">
                    {/* Text column */}
                    <div className="order-2 lg:order-1">
                        <p className="eyebrow">Ontario residential solar</p>
                        <h1 className="mt-4 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
                            See what your roof can do.
                        </h1>
                        <p className="mt-5 max-w-lg text-balance text-[15px] leading-relaxed text-[var(--muted)] sm:text-base">
                            Snap a photo of your hydro bill. We find your roof
                            on satellite and run the real solar physics —
                            including the actual shadows from your trees and
                            neighbours.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Button href="/upload" arrow>
                                Start with my bill
                            </Button>
                        </div>
                    </div>

                    {/* Hero image card */}
                    <div className="order-1 lg:order-2">
                        <HeroImageCard />
                    </div>
                </div>

                <FeatureRow />
            </main>

            <footer className="px-5 pb-6 text-center text-xs text-[var(--subtle)] sm:px-10">
                Built for SenecaHacks 2026
            </footer>
        </div>
    );
}

function HeroImageCard() {
    return (
        <div
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] ring-1 ring-black/5 sm:aspect-[5/6] lg:aspect-[4/5]"
            style={{
                backgroundImage:
                    "url('/hero.png'), linear-gradient(170deg, #052e16 0%, #064e3b 45%, #65a30d 110%)",
                backgroundSize: "cover, auto",
                backgroundPosition: "left center, center",
                backgroundRepeat: "no-repeat, no-repeat",
            }}
        >
            {/* subtle vignette so the chip reads on any photo */}
            <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
            />

            {/* glass chip — backdrop-blur shines over the photo */}
            <div className="absolute right-4 bottom-4 left-4 sm:right-5 sm:bottom-5 sm:left-5">
                <div className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-white">
                    <span className="text-[13px] font-medium leading-tight">
                        See your roof in shadow, hour by hour
                    </span>
                    <Link
                        href="/sandbox"
                        aria-label="Open shadow demo"
                        className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition hover:bg-white/90"
                    >
                        <svg
                            viewBox="0 0 16 16"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 8h10M9 4l4 4-4 4" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

const FEATURES: { title: string; body: string }[] = [
    {
        title: "Snap",
        body: "Photo of your hydro bill — we read the address and your usage.",
    },
    {
        title: "Map",
        body: "Find your roof on satellite, model the sun and shadows year-round.",
    },
    {
        title: "See",
        body: "Real generation, real payback, real Ontario rebates — no sales pitch.",
    },
];

function FeatureRow() {
    return (
        <section className="mx-auto mt-12 grid w-full max-w-6xl grid-cols-1 gap-3 pb-6 sm:grid-cols-3 sm:gap-4 lg:mt-20">
            {FEATURES.map((f, i) => (
                <div
                    key={f.title}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
                >
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-[var(--subtle)]">
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[13px] font-semibold uppercase tracking-[0.12em]">
                            {f.title}
                        </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                        {f.body}
                    </p>
                </div>
            ))}
        </section>
    );
}
