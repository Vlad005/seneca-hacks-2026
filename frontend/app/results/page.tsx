"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "mapbox-gl/dist/mapbox-gl.css";

import { fetchCloudHistory, fetchPvAnalysis } from "@/lib/api";
import { geocodeAddress } from "@/lib/geocode";
import {
    loadBill,
    loadGeo,
    saveAnalysis,
    saveCloud,
    saveGeo,
} from "@/lib/storage";
import type { CloudHistory, PvAnalysis } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SHADEMAP_KEY = process.env.NEXT_PUBLIC_SHADEMAP_KEY ?? "";

const CHECKLIST: { label: string; appearAtSec: number }[] = [
    { label: "Located your rooftop", appearAtSec: 3.0 },
    { label: "Mapping your shadow coverage", appearAtSec: 5.5 },
    { label: "Pulling cloud cover over your address", appearAtSec: 8.5 },
    { label: "Crunching your bill against the panels", appearAtSec: 11.0 },
];

const LOADER_MIN_SEC = 13;
const LOADER_MAX_SEC = 25;
const FLY_IN_MS = 3000;
const INITIAL_ZOOM = 5;
const FINAL_ZOOM = 18;

/** Cinematic phase boundaries (seconds). */
const T_FLY_END = 3.0;
const T_SWEEP1_END = 7.0; // dawn → dusk (4s)
const T_NIGHT_END = 8.5; // dusk → midnight-ish (1.5s)
const T_SWEEP2_END = 12.5; // pre-dawn → right now (4s)

type Phase = "loader" | "results" | "error";

export default function ResultsPage() {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const shadeRef = useRef<ShadeMap | null>(null);
    const tickerRef = useRef<number | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const shadeIdleRef = useRef<boolean>(true);
    const ambientTimerRef = useRef<number | null>(null);
    const startRef = useRef<number>(0);
    const dataReadyRef = useRef<boolean>(false);
    const phaseRef = useRef<Phase>("loader");

    const [phase, setPhase] = useState<Phase>("loader");
    const [elapsedSec, setElapsedSec] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<PvAnalysis | null>(null);
    const [cloud, setCloud] = useState<CloudHistory | null>(null);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        const bill = loadBill();
        if (!bill) {
            router.replace("/upload");
            return;
        }
        let cancelled = false;

        (async () => {
            let geo = loadGeo();
            if (!geo) {
                const query = [
                    bill.service_address,
                    bill.city,
                    bill.postal_code,
                    "Ontario, Canada",
                ]
                    .filter(Boolean)
                    .join(", ");
                geo = await geocodeAddress(query);
                if (geo) saveGeo(geo);
            }
            if (cancelled) return;
            if (!geo) {
                setError("We couldn't pin your address on the map.");
                setPhase("error");
                return;
            }
            if (!containerRef.current || !MAPBOX_TOKEN) {
                setError(
                    MAPBOX_TOKEN
                        ? "Map container missing."
                        : "NEXT_PUBLIC_MAPBOX_TOKEN not set.",
                );
                setPhase("error");
                return;
            }

            mapboxgl.accessToken = MAPBOX_TOKEN;
            const map = new mapboxgl.Map({
                container: containerRef.current,
                style: "mapbox://styles/mapbox/satellite-streets-v12",
                center: [geo.lon, geo.lat],
                zoom: INITIAL_ZOOM,
                pitch: 0,
                bearing: 0,
            });
            mapRef.current = map;

            map.on("error", (e) => console.warn("[mapbox]", e?.error));

            map.on("load", () => {
                if (cancelled) return;

                // 1) ShadeMap — initialized at sunrise, driven via idle-gated RAF.
                //    Opacity starts at 0 and tweens up between t=2.0s and t=3.5s so
                //    shadows fade *in* rather than popping when the fly-in lands.
                try {
                    const shade = new ShadeMap({
                        date: dawnToday(),
                        color: "#000000",
                        opacity: 0,
                        apiKey: SHADEMAP_KEY,
                        terrainSource: {
                            tileSize: 256,
                            maxZoom: 15,
                            getSourceUrl: ({ x, y, z }) =>
                                `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
                            getElevation: ({ r, g, b }) =>
                                r * 256 + g + b / 256 - 32768,
                        },
                        getFeatures: async () => {
                            return map
                                .querySourceFeatures("composite", {
                                    sourceLayer: "building",
                                })
                                .filter(
                                    (f) =>
                                        f.properties &&
                                        f.properties.underground !== "true" &&
                                        (f.properties.height ||
                                            f.properties.render_height),
                                );
                        },
                    }).addTo(map);
                    shadeRef.current = shade;
                    // Mark idle whenever shadows finish rendering — RAF driver only
                    // fires setDate when this flag is true, so we never queue more
                    // renders than ShadeMap can actually complete.
                    shade.on("idle", () => {
                        shadeIdleRef.current = true;
                    });
                } catch (e) {
                    console.warn("[shademap] init failed", e);
                }

                // 2) Fly-in: zoom only, no tilt. Top-down view all the way — pitch
                //    on a flat satellite image just amplifies the flatness.
                map.flyTo({
                    center: [geo.lon, geo.lat],
                    zoom: FINAL_ZOOM,
                    pitch: 0,
                    bearing: 0,
                    duration: FLY_IN_MS,
                    essential: true,
                });

                // 3) After the fly-in lands, find and highlight the user's house only.
                map.once("moveend", () => {
                    if (cancelled) return;
                    highlightUserHouse(map, geo.lon, geo.lat);
                });

                // 4) Two-track timing:
                //    - RAF drives ShadeMap setDate at browser cadence (~60fps) for
                //      smooth, continuous shadow motion. ShadeMap renders whatever
                //      latest date it received as fast as it can.
                //    - 80ms interval drives React UI state (progress bar + checklist
                //      reveal). Slower so we don't re-render 60 times a second.
                startRef.current = performance.now();

                const driveShade = () => {
                    if (cancelled) return;
                    if (shadeIdleRef.current && shadeRef.current) {
                        shadeIdleRef.current = false;
                        const t = (performance.now() - startRef.current) / 1000;
                        driveCinematic(t, shadeRef.current);
                        shadeRef.current.setOpacity(shadeOpacityAt(t));
                    }
                    rafIdRef.current = requestAnimationFrame(driveShade);
                };
                rafIdRef.current = requestAnimationFrame(driveShade);

                tickerRef.current = window.setInterval(() => {
                    if (cancelled) return;
                    const t = (performance.now() - startRef.current) / 1000;
                    setElapsedSec(t);

                    if (
                        (dataReadyRef.current && t >= LOADER_MIN_SEC) ||
                        t >= LOADER_MAX_SEC
                    ) {
                        if (tickerRef.current !== null) {
                            window.clearInterval(tickerRef.current);
                            tickerRef.current = null;
                        }
                        if (rafIdRef.current !== null) {
                            cancelAnimationFrame(rafIdRef.current);
                            rafIdRef.current = null;
                        }
                        shadeRef.current?.setOpacity(0.85);
                        shadeRef.current?.setDate(new Date());
                        // Ambient mode: re-stamp the current time every minute so the
                        // shadows on /results stay anchored to real-time clock.
                        if (ambientTimerRef.current === null) {
                            ambientTimerRef.current = window.setInterval(() => {
                                shadeRef.current?.setDate(new Date());
                            }, 60_000);
                        }
                        setPhase("results");
                    }
                }, 80);
            });

            // 5) Fire backend in parallel — runs while map is loading tiles.
            try {
                const [pv, cl] = await Promise.all([
                    fetchPvAnalysis(geo.lat, geo.lon),
                    fetchCloudHistory(geo.lat, geo.lon).catch(() => null),
                ]);
                if (cancelled) return;
                saveAnalysis(pv);
                setAnalysis(pv);
                if (cl) {
                    saveCloud(cl);
                    setCloud(cl);
                }
                dataReadyRef.current = true;
            } catch (e) {
                if (cancelled) return;
                setError(
                    e instanceof Error
                        ? e.message
                        : "Solar analysis failed. Try again in a moment.",
                );
                setPhase("error");
            }
        })();

        return () => {
            cancelled = true;
            if (tickerRef.current !== null)
                window.clearInterval(tickerRef.current);
            if (rafIdRef.current !== null)
                cancelAnimationFrame(rafIdRef.current);
            if (ambientTimerRef.current !== null)
                window.clearInterval(ambientTimerRef.current);
            shadeRef.current?.remove();
            mapRef.current?.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Checklist: opacity-fade-in items as their time arrives.
    const itemStates = CHECKLIST.map((c) => ({
        label: c.label,
        done: elapsedSec >= c.appearAtSec,
    }));

    // Smooth asymptotic progress — no caps, no jumps. Approaches 100% without
    // ever sitting at one number. Reaches ~94% at the natural cinematic end.
    const progress = 1 - Math.exp(-elapsedSec / 4.5);
    const nightDim = nightOverlayOpacity(elapsedSec);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a1018]">
            <div
                ref={containerRef}
                className="absolute inset-0"
                style={{ width: "100%", height: "100%" }}
            />

            {/* Cinematic vignette so the loader card pops. */}
            <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
                    phase === "loader" ? "opacity-100" : "opacity-30"
                }`}
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(0,0,0,0) 20%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.78) 100%)",
                }}
            />

            {/* Night dimmer — fades the actual map dark during the night beat,
          does NOT touch the loader card (lives below it in z-order). */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background: "#020611",
                    opacity: nightDim,
                    transition: "opacity 300ms linear",
                }}
            />

            {phase === "loader" && (
                <LoaderCard
                    items={itemStates}
                    progressPct={Math.round(progress * 100)}
                />
            )}

            {phase === "results" && analysis && (
                <ResultsPlaceholder
                    analysis={analysis}
                    cloud={cloud}
                    onBack={() => router.push("/rebates/extras")}
                />
            )}

            {phase === "error" && (
                <ErrorOverlay
                    message={error ?? "Something went wrong."}
                    onBack={() => router.push("/rebates/extras")}
                />
            )}
        </div>
    );
}

/* ----------------------- cinematic + math helpers ----------------------- */

function dawnToday(): Date {
    const d = new Date();
    d.setHours(6, 30, 0, 0);
    return d;
}

function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Cinematic choreography:
 *   0 – 3.0s  fly-in is happening; hold at dawn (long raking shadows)
 *   3.0 – 7.0s  first sweep: dawn (6:30) → dusk (20:00), 4s, slower
 *   7.0 – 8.5s  night: 20:00 → 23:30 (sun below horizon, deep shadow rest)
 *   8.5 – 12.5s second sweep: 5:00 → right-now-time-of-day, 4s
 *   12.5s +     real-time, settled
 */
function driveCinematic(t: number, shade: ShadeMap | null): void {
    if (!shade) return;
    const now = new Date();
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);

    if (t < T_FLY_END) {
        shade.setDate(dawnToday());
        return;
    }
    if (t < T_SWEEP1_END) {
        const f = easeInOutSine((t - T_FLY_END) / (T_SWEEP1_END - T_FLY_END));
        setHourFrac(base, 6.5 + f * 13.5); // 6:30 → 20:00
        shade.setDate(base);
        return;
    }
    if (t < T_NIGHT_END) {
        const f = easeInOutSine(
            (t - T_SWEEP1_END) / (T_NIGHT_END - T_SWEEP1_END),
        );
        setHourFrac(base, 20 + f * 3.5); // 20:00 → 23:30
        shade.setDate(base);
        return;
    }
    if (t < T_SWEEP2_END) {
        const f = easeInOutSine(
            (t - T_NIGHT_END) / (T_SWEEP2_END - T_NIGHT_END),
        );
        const endHour = now.getHours() + now.getMinutes() / 60;
        const startHour = 5.0;
        setHourFrac(base, startHour + f * (endHour - startHour));
        shade.setDate(base);
        return;
    }
    shade.setDate(now);
}

function setHourFrac(d: Date, hourFrac: number): void {
    const intH = Math.floor(hourFrac);
    const minute = Math.floor((hourFrac - intH) * 60);
    d.setHours(intH, minute, 0, 0);
}

/** Fades shadow opacity from 0 → 0.85 between t=2.0s and t=3.5s, then holds. */
function shadeOpacityAt(t: number): number {
    const FADE_START = 2.0;
    const FADE_END = 3.5;
    const PEAK = 0.85;
    if (t < FADE_START) return 0;
    if (t < FADE_END)
        return ((t - FADE_START) / (FADE_END - FADE_START)) * PEAK;
    return PEAK;
}

/** Black-overlay opacity over the map. Peaks during the night beat (7–8.5s)
 *  with a 0.5s fade in/out so the transition feels intentional. */
function nightOverlayOpacity(t: number): number {
    const PEAK = 0.6;
    const FADE = 0.5;
    if (t < T_SWEEP1_END - FADE) return 0;
    if (t < T_SWEEP1_END) {
        return ((t - (T_SWEEP1_END - FADE)) / FADE) * PEAK;
    }
    if (t < T_NIGHT_END) return PEAK;
    if (t < T_NIGHT_END + FADE) {
        return (1 - (t - T_NIGHT_END) / FADE) * PEAK;
    }
    return 0;
}

/* ---- user house highlight ---- */

function pointInRing(point: [number, number], ring: number[][]): boolean {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

interface BuildingFeature {
    geometry: {
        type: "Polygon" | "MultiPolygon" | string;
        coordinates: number[][][] | number[][][][];
    };
}

function findHouseAtPoint(
    features: BuildingFeature[],
    lon: number,
    lat: number,
): BuildingFeature | null {
    const point: [number, number] = [lon, lat];
    for (const f of features) {
        const g = f.geometry;
        if (g.type === "Polygon") {
            const coords = g.coordinates as number[][][];
            if (coords[0] && pointInRing(point, coords[0])) return f;
        } else if (g.type === "MultiPolygon") {
            const polys = g.coordinates as number[][][][];
            for (const poly of polys) {
                if (poly[0] && pointInRing(point, poly[0])) return f;
            }
        }
    }
    return null;
}

function highlightUserHouse(map: mapboxgl.Map, lon: number, lat: number): void {
    try {
        const all = map.querySourceFeatures("composite", {
            sourceLayer: "building",
        });
        const house = findHouseAtPoint(
            all as unknown as BuildingFeature[],
            lon,
            lat,
        );
        if (!house) {
            console.warn("[results] no building polygon found at", lon, lat);
            return;
        }
        const data = {
            type: "Feature" as const,
            geometry: house.geometry as never,
            properties: {},
        };
        if (!map.getSource("user-house")) {
            map.addSource("user-house", { type: "geojson", data });
        } else {
            const src = map.getSource("user-house") as mapboxgl.GeoJSONSource;
            src.setData(data as never);
        }
        if (!map.getLayer("user-house-glow")) {
            map.addLayer({
                id: "user-house-glow",
                type: "line",
                source: "user-house",
                paint: {
                    "line-color": "#22d3ee",
                    "line-width": 8,
                    "line-blur": 8,
                    "line-opacity": 0.55,
                },
            });
            map.addLayer({
                id: "user-house-line",
                type: "line",
                source: "user-house",
                paint: {
                    "line-color": "#a5f3fc",
                    "line-width": 2,
                    "line-opacity": 1,
                },
            });
        }
    } catch (e) {
        console.warn("[results] highlight failed", e);
    }
}

/* ------------------------------ subcomponents --------------------------- */

function LoaderCard({
    items,
    progressPct,
}: {
    items: { label: string; done: boolean }[];
    progressPct: number;
}) {
    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 text-[var(--foreground)] sm:p-7">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--subtle)]">
                    Real-time analysis
                </p>
                <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] sm:text-[26px]">
                    Building your solar report
                </h2>

                <ul className="mt-6 space-y-3">
                    {items.map((it, i) => (
                        <li
                            key={i}
                            className={`flex items-center gap-3 text-[14px] transition-opacity duration-500 ${
                                it.done ? "opacity-100" : "opacity-30"
                            }`}
                        >
                            <CheckPill done={it.done} />
                            <span
                                className={
                                    it.done ? "" : "text-[var(--subtle)]"
                                }
                            >
                                {it.label}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-7">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-[width] duration-200 ease-out"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--subtle)] tabular-nums">
                        <span>This usually takes 8 – 15 seconds</span>
                        <span>{progressPct}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckPill({ done }: { done: boolean }) {
    return (
        <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                done
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-[var(--border)] bg-white"
            }`}
            aria-hidden
        >
            {done ? (
                <svg
                    viewBox="0 0 16 16"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M3.5 8.5l3 3 6-7" />
                </svg>
            ) : (
                <span className="h-1 w-1 rounded-full bg-[var(--subtle)]" />
            )}
        </span>
    );
}

function ResultsPlaceholder({
    analysis,
    cloud,
    onBack,
}: {
    analysis: PvAnalysis;
    cloud: CloudHistory | null;
    onBack: () => void;
}) {
    return (
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-8">
            <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-white p-6">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--subtle)]">
                    Phase 2 complete · ready for Phase 3
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                    {Math.round(analysis.annual_kwh).toLocaleString()}
                    <span className="ml-2 text-base font-normal text-[var(--muted)]">
                        kWh per year
                    </span>
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                    {analysis.system_kw} kW system · {analysis.panel_count}{" "}
                    panels · {analysis.avg_realization_pct}% of theoretical
                    sunlight reaches your roof
                    {cloud
                        ? ` · ${cloud.annual_avg_pct}% avg cloud cover (${cloud.years_averaged}yr)`
                        : ""}
                    .
                </p>
                <div className="mt-5 flex gap-3">
                    <button
                        onClick={onBack}
                        className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}

function ErrorOverlay({
    message,
    onBack,
}: {
    message: string;
    onBack: () => void;
}) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4">
            <div
                className="max-w-md rounded-3xl border p-6 text-white"
                style={{
                    background: "rgba(13, 22, 36, 0.7)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderColor: "rgba(255, 255, 255, 0.18)",
                }}
            >
                <h2 className="text-lg font-semibold">We hit a snag</h2>
                <p className="mt-2 text-sm text-white/80">{message}</p>
                <button
                    onClick={onBack}
                    className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90"
                >
                    Go back
                </button>
            </div>
        </div>
    );
}
