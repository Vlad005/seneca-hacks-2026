/**
 * User-facing system customization — panel type, count, tilt, azimuth.
 *
 * Panel presets are real Canadian-market modules with credible 2025–2026
 * installed pricing (median Ontario residential quote — includes labour,
 * racking, inverter, permits; not raw module cost).
 */

export type PanelPresetId =
  | "canadian-solar-hiku7"
  | "rec-alpha-pure-r"
  | "silfab-bifacial";

export interface PanelPreset {
  id: PanelPresetId;
  brand: string;
  model: string;
  tier: string;
  watts: number;
  efficiency: number; // 0..1
  area_sqm: number;
  /** Installed CAD per watt — system price, not module price. */
  cost_per_w_cad: number;
}

export const PANEL_PRESETS: PanelPreset[] = [
  {
    id: "canadian-solar-hiku7",
    brand: "Canadian Solar",
    model: "HiKu7 400 W",
    tier: "Standard mono",
    watts: 400,
    efficiency: 0.2,
    area_sqm: 1.95,
    cost_per_w_cad: 3.0,
  },
  {
    id: "rec-alpha-pure-r",
    brand: "REC",
    model: "Alpha Pure-R 430 W",
    tier: "Premium mono",
    watts: 430,
    efficiency: 0.22,
    area_sqm: 1.96,
    cost_per_w_cad: 3.5,
  },
  {
    id: "silfab-bifacial",
    brand: "Silfab",
    model: "SIL-460 BG 460 W",
    tier: "Bifacial high-output",
    watts: 460,
    efficiency: 0.225,
    area_sqm: 2.1,
    cost_per_w_cad: 3.9,
  },
];

export const STANDARD_PRESET = PANEL_PRESETS[0];

export function presetById(id: PanelPresetId | string | undefined): PanelPreset {
  return PANEL_PRESETS.find((p) => p.id === id) ?? STANDARD_PRESET;
}

export interface Customization {
  panelPresetId: PanelPresetId;
  panelCount: number;
  /** Azimuth in degrees from north, clockwise. 180 = due south. */
  azimuthDeg: number;
  /** Roof pitch in degrees, 10–45. */
  tiltDeg: number;
}

export const AZIMUTH_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "North" },
  { value: 45, label: "Northeast" },
  { value: 90, label: "East" },
  { value: 135, label: "Southeast" },
  { value: 180, label: "South" },
  { value: 225, label: "Southwest" },
  { value: 270, label: "West" },
  { value: 315, label: "Northwest" },
];

export const TILT_MIN = 10;
export const TILT_MAX = 45;
export const PANEL_COUNT_MIN = 6;
export const PANEL_COUNT_MAX = 50;

/** Build a default customization for a roof with a detected panel count. */
export function defaultCustomization(panelCount: number): Customization {
  return {
    panelPresetId: STANDARD_PRESET.id,
    panelCount: Math.max(PANEL_COUNT_MIN, Math.min(PANEL_COUNT_MAX, panelCount)),
    azimuthDeg: 180,
    tiltDeg: 30,
  };
}

/** Approximate installed cost in CAD for a given customization. */
export function estimateUpfrontCost(c: Customization): number {
  const preset = presetById(c.panelPresetId);
  const systemKw = (c.panelCount * preset.watts) / 1000;
  // Includes a $500 LDC connection / inspection fee (mirrors payback.ts).
  return systemKw * 1000 * preset.cost_per_w_cad + 500;
}
