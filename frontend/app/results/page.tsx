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
  { label: "Located your rooftop", appearAtSec: 1.2 },
  { label: "Mapping sunlight through the year", appearAtSec: 3.5 },
  { label: "Modeling cloud cover over your address", appearAtSec: 6.0 },
  { label: "Crunching your bill against the panels", appearAtSec: 8.5 },
];

const LOADER_MIN_SEC = 10;
const LOADER_MAX_SEC = 25;
const CINEMATIC_TICK_MS = 150; // ShadeMap can't keep up faster

type Phase = "loader" | "results" | "error";

export default function ResultsPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const shadeRef = useRef<ShadeMap | null>(null);
  const tickerRef = useRef<number | null>(null);
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
        zoom: 18,
        pitch: 0,
        bearing: 0,
      });
      mapRef.current = map;

      map.on("error", (e) => console.warn("[mapbox]", e?.error));

      // Start as soon as the style is ready — buildings come in shortly after.
      // Don't wait for idle: at zoom 18 on a pitched 3D scene "idle" can take
      // many seconds (or never fire) and the user just sees a blank screen.
      map.on("load", () => {
        if (cancelled) return;

        // 1) Cyan building outlines (glow + crisp stroke). Every visible
        //    building gets traced — even before shadows render.
        try {
          if (!map.getLayer("building-outline-glow")) {
            map.addLayer({
              id: "building-outline-glow",
              type: "line",
              source: "composite",
              "source-layer": "building",
              filter: ["!=", ["get", "underground"], "true"],
              paint: {
                "line-color": "#22d3ee",
                "line-width": 4,
                "line-blur": 4,
                "line-opacity": 0.4,
              },
            });
            map.addLayer({
              id: "building-outline",
              type: "line",
              source: "composite",
              "source-layer": "building",
              filter: ["!=", ["get", "underground"], "true"],
              paint: {
                "line-color": "#67e8f9",
                "line-width": 1.4,
                "line-opacity": 0.95,
              },
            });
          }
        } catch (e) {
          console.warn("[mapbox] building outline layer failed", e);
        }

        // 2) ShadeMap with prominent shadows.
        try {
          const shade = new ShadeMap({
            date: dawnToday(),
            color: "#000000",
            opacity: 0.85,
            apiKey: SHADEMAP_KEY,
            terrainSource: {
              tileSize: 256,
              maxZoom: 15,
              getSourceUrl: ({ x, y, z }) =>
                `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
              getElevation: ({ r, g, b }) => r * 256 + g + b / 256 - 32768,
            },
            getFeatures: async () => {
              return map
                .querySourceFeatures("composite", { sourceLayer: "building" })
                .filter(
                  (f) =>
                    f.properties &&
                    f.properties.underground !== "true" &&
                    (f.properties.height || f.properties.render_height),
                );
            },
          }).addTo(map);
          shadeRef.current = shade;
        } catch (e) {
          console.warn("[shademap] init failed", e);
        }

        // 3) Animate camera in for cinematic feel — pitch up + slow bearing
        //    drift over the full cinematic window.
        map.easeTo({
          pitch: 45,
          bearing: 18,
          duration: 8500,
          easing: easeInOutSine,
        });

        // 4) Throttled cinematic ticker — ShadeMap can't keep up faster.
        startRef.current = performance.now();
        tickerRef.current = window.setInterval(() => {
          if (cancelled) return;
          const t = (performance.now() - startRef.current) / 1000;
          setElapsedSec(t);
          driveCinematic(t, shadeRef.current);

          if (
            (dataReadyRef.current && t >= LOADER_MIN_SEC) ||
            t >= LOADER_MAX_SEC
          ) {
            if (tickerRef.current !== null) {
              window.clearInterval(tickerRef.current);
              tickerRef.current = null;
            }
            shadeRef.current?.setDate(new Date());
            map.easeTo({
              pitch: 20,
              bearing: 0,
              zoom: 18.5,
              duration: 1400,
              easing: easeInOutSine,
            });
            setPhase("results");
          }
        }, CINEMATIC_TICK_MS);
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
      if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
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

  // Progress: time-based until 95%, then waits for backend, then snaps to 100.
  const timePct = Math.min(elapsedSec / LOADER_MIN_SEC, 1);
  const progress = dataReadyRef.current
    ? Math.max(timePct, 0.97)
    : Math.min(timePct, 0.95);

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

      {phase === "loader" && (
        <LoaderCard items={itemStates} progressPct={Math.round(progress * 100)} />
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
 *  0–2.0s:  hold at dawn (long raking shadows)
 *  2.0–4.5s: scrub through today (dawn → dusk, sun sweeps east→west)
 *  4.5–7.5s: scrub through the year at solar noon (seasonal length shift)
 *  7.5–9.5s: ease back from year-end to right-now
 *  9.5s+:   real-time (settled)
 */
function driveCinematic(t: number, shade: ShadeMap | null): void {
  if (!shade) return;
  const now = new Date();

  if (t < 2.0) {
    shade.setDate(dawnToday());
    return;
  }
  if (t < 4.5) {
    const f = easeInOutSine((t - 2.0) / 2.5);
    const d = new Date(now);
    const hour = 6.5 + f * 13.5; // 6:30 → 20:00
    const intHr = Math.floor(hour);
    const minute = Math.floor((hour - intHr) * 60);
    d.setHours(intHr, minute, 0, 0);
    shade.setDate(d);
    return;
  }
  if (t < 7.5) {
    const f = easeInOutSine((t - 4.5) / 3.0);
    const dayOfYear = Math.round(f * 364);
    const d = new Date(now.getFullYear(), 0, 1, 12, 0, 0);
    d.setDate(d.getDate() + dayOfYear);
    shade.setDate(d);
    return;
  }
  if (t < 9.5) {
    const f = easeInOutSine((t - 7.5) / 2.0);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 12, 0, 0).getTime();
    const ms = yearEnd + (now.getTime() - yearEnd) * f;
    shade.setDate(new Date(ms));
    return;
  }
  shade.setDate(now);
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
      <div
        className="pointer-events-auto w-full max-w-md rounded-3xl border p-6 text-white shadow-2xl sm:p-7"
        style={{
          background: "rgba(13, 22, 36, 0.55)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderColor: "rgba(255, 255, 255, 0.18)",
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
          Real-time analysis
        </p>
        <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] sm:text-[26px]">
          Building your solar report
        </h2>

        <ul className="mt-6 space-y-3">
          {items.map((it, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 text-[14px] transition-all duration-500 ${
                it.done
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-25"
              }`}
            >
              <CheckPill done={it.done} />
              <span className={it.done ? "" : "text-white/60"}>{it.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-[width] duration-200 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/55 tabular-nums">
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
          ? "border-emerald-300 bg-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
          : "border-white/25 bg-white/5"
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
        <span className="h-1 w-1 rounded-full bg-white/40" />
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
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-white p-6 shadow-2xl">
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
          {analysis.system_kw} kW system · {analysis.panel_count} panels ·{" "}
          {analysis.avg_realization_pct}% of theoretical sunlight reaches your roof
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
