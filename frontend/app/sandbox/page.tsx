"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import ShadeMap from "mapbox-gl-shadow-simulator";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SHADEMAP_KEY = process.env.NEXT_PUBLIC_SHADEMAP_KEY ?? "";

const TORONTO_DOWNTOWN: [number, number] = [-79.3832, 43.6532];

export default function SandboxPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const shadeRef = useRef<ShadeMap | null>(null);
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(15, 0, 0, 0);
    return d;
  });
  const [boot, setBoot] = useState<{
    mapboxToken: "set" | "missing";
    shademapKey: "set" | "missing";
    mapStatus: string;
    shadeStatus: string;
    error: string | null;
  }>({
    mapboxToken: MAPBOX_TOKEN ? "set" : "missing",
    shademapKey: SHADEMAP_KEY ? "set" : "missing",
    mapStatus: "waiting for mount",
    shadeStatus: "waiting for map",
    error: null,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    if (!MAPBOX_TOKEN) {
      setBoot((b) => ({
        ...b,
        mapStatus: "halted — NEXT_PUBLIC_MAPBOX_TOKEN missing",
      }));
      return;
    }

    setBoot((b) => ({ ...b, mapStatus: "initializing Mapbox…" }));
    mapboxgl.accessToken = MAPBOX_TOKEN;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: TORONTO_DOWNTOWN,
        zoom: 16,
        pitch: 0,
      });
    } catch (e) {
      setBoot((b) => ({ ...b, error: `Mapbox ctor threw: ${String(e)}` }));
      return;
    }
    mapRef.current = map;

    map.on("error", (e) => {
      console.error("[mapbox]", e);
      setBoot((b) => ({
        ...b,
        error: `Mapbox error: ${e.error?.message ?? "unknown"}`,
      }));
    });

    map.on("load", () => {
      setBoot((b) => ({ ...b, mapStatus: "map loaded", shadeStatus: "initializing ShadeMap…" }));

      try {
        const shade = new ShadeMap({
          date,
          color: "#01112f",
          opacity: 0.7,
          apiKey: SHADEMAP_KEY,
          terrainSource: {
            tileSize: 256,
            maxZoom: 15,
            getSourceUrl: ({ x, y, z }) =>
              `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
            getElevation: ({ r, g, b }) => r * 256 + g + b / 256 - 32768,
          },
          getFeatures: async () => {
            const buildings = map
              .querySourceFeatures("composite", { sourceLayer: "building" })
              .filter(
                (f) =>
                  f.properties &&
                  f.properties.underground !== "true" &&
                  (f.properties.height || f.properties.render_height),
              );
            return buildings;
          },
          debug: (msg: string) => console.log("[shademap]", msg),
        }).addTo(map);

        shade.on("idle", () =>
          setBoot((b) => ({ ...b, shadeStatus: "shadows rendered" })),
        );
        shadeRef.current = shade;
      } catch (e) {
        setBoot((b) => ({ ...b, error: `ShadeMap ctor threw: ${String(e)}` }));
      }
    });

    return () => {
      shadeRef.current?.remove();
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    shadeRef.current?.setDate(date);
  }, [date]);

  const shift = (hours: number) =>
    setDate((prev) => new Date(prev.getTime() + hours * 3_600_000));
  const now = () => setDate(new Date());

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, background: "#222" }}
      />
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          background: "rgba(0,0,0,0.78)",
          color: "white",
          padding: "12px 16px",
          borderRadius: 8,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 13,
          backdropFilter: "blur(6px)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <strong style={{ fontFamily: "system-ui, sans-serif" }}>
          ShadeMap smoke test
        </strong>
        <button
          onClick={() => shift(-1)}
          style={btnStyle}
        >
          −1h
        </button>
        <button onClick={() => shift(1)} style={btnStyle}>
          +1h
        </button>
        <button onClick={now} style={btnStyle}>
          Now
        </button>
        <span>
          {date.toLocaleString("en-CA", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <span style={{ marginLeft: "auto", opacity: 0.85 }}>
          mapbox token: <b>{boot.mapboxToken}</b> &nbsp;|&nbsp; shademap key:{" "}
          <b>{boot.shademapKey}</b> &nbsp;|&nbsp; map: <b>{boot.mapStatus}</b>{" "}
          &nbsp;|&nbsp; shade: <b>{boot.shadeStatus}</b>
        </span>
        {boot.error && (
          <div
            style={{
              width: "100%",
              background: "#7f1d1d",
              padding: "8px 12px",
              borderRadius: 6,
              color: "#fff",
            }}
          >
            {boot.error}
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  color: "white",
  border: "none",
  padding: "4px 12px",
  borderRadius: 4,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
};
