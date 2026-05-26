/**
 * Compute roof params from the building polygon Mapbox already gave us.
 *
 * Inputs:  a single closed ring of [lon, lat] pairs (building footprint).
 * Outputs: footprint area, usable roof area, panel count, system kW.
 *
 * Formulas (transparent on purpose — surface these in the UI as a footnote):
 *
 *   footprint_sqm   = shoelace area of the polygon on a local Mercator
 *                     projection (cos(lat)-corrected longitude scale).
 *   total_roof_sqm  = footprint_sqm × 1 / cos(30°)    ≈ footprint × 1.155
 *                     (pitch correction; assumes ~30° residential slope)
 *   usable_sqm      = total_roof_sqm × 0.5 × 0.85
 *                     (south half × 15% obstruction allowance for vents,
 *                      chimneys, walkways, panel-edge buffers)
 *   panel_count     = floor(usable_sqm / PANEL_SLOT_SQM)
 *                     where PANEL_SLOT_SQM = 2.2 m² (1.92 m² panel + ~15% gap)
 *   system_kw       = panel_count × PANEL_WATTS / 1000
 */

import { STANDARD_PRESET, type PanelPreset } from "./customization";

/** Slot footprint per panel ≈ panel area × 15% spacing buffer. */
export const SPACING_BUFFER = 1.15;
export const ASSUMED_TILT_DEG = 30;
export const PITCH_MULTIPLIER = 1 / Math.cos((ASSUMED_TILT_DEG * Math.PI) / 180);
export const SOUTH_HALF_FRACTION = 0.5;
export const OBSTRUCTION_FACTOR = 0.85;

const M_PER_DEG_LAT = 111_320;

export interface RoofConfig {
  footprint_sqm: number;
  usable_sqm: number;
  panel_count: number;
  panel_area_sqm: number;
  panel_efficiency_stc: number;
  system_kw: number;
  tilt_deg: number;
  azimuth_deg: number;
}

/** Shoelace area in square metres for a [lon, lat] closed ring. */
export function polygonAreaSqMeters(ring: number[][]): number {
  if (!ring || ring.length < 3) return 0;
  const centerLat =
    ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180);

  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const xi = ring[i][0] * mPerDegLon;
    const yi = ring[i][1] * M_PER_DEG_LAT;
    const xj = ring[j][0] * mPerDegLon;
    const yj = ring[j][1] * M_PER_DEG_LAT;
    sum += xi * yj - xj * yi;
  }
  return Math.abs(sum) / 2;
}

/** Pull the outer ring from a Polygon, or the largest ring from a MultiPolygon. */
export function extractOuterRing(geometry: {
  type: string;
  coordinates: unknown;
}): number[][] | null {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return coords[0] ?? null;
  }
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as number[][][][];
    let best: number[][] | null = null;
    let bestArea = 0;
    for (const poly of polys) {
      const ring = poly[0];
      if (!ring) continue;
      const a = polygonAreaSqMeters(ring);
      if (a > bestArea) {
        bestArea = a;
        best = ring;
      }
    }
    return best;
  }
  return null;
}

/** Build a complete RoofConfig from a footprint area + a chosen panel preset. */
export function roofFromFootprint(
  footprintSqm: number,
  preset: PanelPreset = STANDARD_PRESET,
): RoofConfig {
  const slotSqm = preset.area_sqm * SPACING_BUFFER;
  const total = footprintSqm * PITCH_MULTIPLIER;
  const usable = Math.max(0, total * SOUTH_HALF_FRACTION * OBSTRUCTION_FACTOR);
  // Clamp panel count to a sane range — 6 is the smallest residential install
  // most LDCs will approve; 50 is well past the 12 kW Ontario residential cap.
  const panel_count = Math.max(6, Math.min(50, Math.floor(usable / slotSqm)));
  const system_kw = Math.round((panel_count * preset.watts) / 100) / 10;
  return {
    footprint_sqm: Math.round(footprintSqm),
    usable_sqm: Math.round(panel_count * slotSqm),
    panel_count,
    panel_area_sqm: preset.area_sqm,
    panel_efficiency_stc: preset.efficiency,
    system_kw,
    tilt_deg: ASSUMED_TILT_DEG,
    azimuth_deg: 180,
  };
}
