import { touEffectiveRate } from "@/data/ontario-rates";
import { HRS_DEMO_SCENARIO, type HrsScenario } from "@/data/scenarios";
import { computePayback } from "./payback";
import type { ExtractedBill, PvAnalysis, UsageProfile } from "./types";
import type { PanelPreset } from "./customization";

export interface DeriveOptions {
  /** When present, the panel preset's cost_per_w drives upfront cost in payback. */
  panelPreset?: PanelPreset;
}

export interface DerivedResults {
  // Roof at a glance (B)
  systemKw: number;
  panelCount: number;
  usableAreaSqm: number;
  annualKwh: number;

  // Bill / usage
  annualUsageKwh: number;
  dailyCurveHourlyFrac: number[]; // 24

  // Typical-day hourly (D)
  hourlyGen: number[]; // 24
  hourlyUsage: number[]; // 24
  hourlySelf: number[]; // 24
  hourlyExport: number[]; // 24
  hourlyGridDraw: number[]; // 24

  // Year aggregates
  annualSavingsCAD: number;
  annualSelfConsumptionPct: number;
  annualExportKwh: number;
  annualBillCreditCAD: number;

  // Monthly (D2)
  monthlyUsage: number[]; // 12
  monthlyGen: number[]; // 12
  monthlyNet: number[]; // 12
  netExportMonths: number;
  netDrawMonths: number;
  annualSelfCoveragePct: number;

  // Sunlight graphs (C)
  theoreticalDaily: number[]; // 365
  actualDaily: number[]; // 365
  avgRealizationPct: number;

  // Payback (F)
  upfrontCost: number;
  breakevenYear: number | null;
  lifetimeValueCAD: number;
  yearlyCashflow: number[]; // length 26
  cumulativeCashflow: number[]; // length 26

  // HRS alt scenario (A toggle)
  hrsScenario: HrsScenario;
}

export function deriveResults(
  bill: ExtractedBill,
  usage: UsageProfile,
  analysis: PvAnalysis,
  options: DeriveOptions = {},
): DerivedResults {
  const dailyCurveHourlyFrac = dailyCurveFromSplit(usage.daily_split);

  const hourlyGen = padTo(24, analysis.typical_day_hourly_kwh);

  const annualUsageKwh = usage.monthly_kwh.reduce((a, b) => a + b, 0);
  const dailyUsage = annualUsageKwh / 365;
  const hourlyUsage = dailyCurveHourlyFrac.map((f) => f * dailyUsage);

  const hourlySelf = hourlyGen.map((g, h) => Math.min(g, hourlyUsage[h]));
  const hourlyExport = hourlyGen.map((g, h) => Math.max(0, g - hourlyUsage[h]));
  const hourlyGridDraw = hourlyGen.map((g, h) =>
    Math.max(0, hourlyUsage[h] - g),
  );

  const annualSavingsCAD = computeTouWeightedAnnual(hourlyGen);
  const annualBillCreditCAD = computeTouWeightedAnnual(hourlyExport);

  const annualGenTypicalDay = hourlyGen.reduce((a, b) => a + b, 0);
  const annualSelf = hourlySelf.reduce((a, b) => a + b, 0) * 365;
  const annualGenAll = annualGenTypicalDay * 365;
  const annualSelfConsumptionPct =
    annualGenAll > 0 ? (annualSelf / annualGenAll) * 100 : 0;
  const annualExportKwh = hourlyExport.reduce((a, b) => a + b, 0) * 365;

  const monthlyUsage = padTo(12, usage.monthly_kwh);
  const monthlyGen = padTo(12, analysis.monthly_generation_kwh);
  const monthlyNet = monthlyGen.map((g, i) => g - monthlyUsage[i]);
  const netExportMonths = monthlyNet.filter((n) => n > 0).length;
  const netDrawMonths = 12 - netExportMonths;
  const totalUsageM = monthlyUsage.reduce((a, b) => a + b, 0);
  const totalGenM = monthlyGen.reduce((a, b) => a + b, 0);
  const annualSelfCoveragePct =
    totalUsageM > 0 ? Math.min(100, (totalGenM / totalUsageM) * 100) : 0;

  const payback = computePayback({
    systemKw: analysis.system_kw,
    year1SavingsCAD: annualSavingsCAD,
    costPerWattCAD: options.panelPreset?.cost_per_w_cad,
  });

  return {
    systemKw: analysis.system_kw,
    panelCount: analysis.panel_count,
    usableAreaSqm: analysis.usable_area_sqm,
    annualKwh: analysis.annual_kwh,
    annualUsageKwh,
    dailyCurveHourlyFrac,
    hourlyGen,
    hourlyUsage,
    hourlySelf,
    hourlyExport,
    hourlyGridDraw,
    annualSavingsCAD,
    annualSelfConsumptionPct,
    annualExportKwh,
    annualBillCreditCAD,
    monthlyUsage,
    monthlyGen,
    monthlyNet,
    netExportMonths,
    netDrawMonths,
    annualSelfCoveragePct,
    theoreticalDaily: padTo(365, analysis.theoretical.daily_kwh),
    actualDaily: padTo(365, analysis.actual.daily_kwh),
    avgRealizationPct: analysis.avg_realization_pct,
    upfrontCost: payback.upfrontCost,
    breakevenYear: payback.breakevenYear,
    lifetimeValueCAD: payback.lifetimeValue,
    yearlyCashflow: payback.yearlyCashflow,
    cumulativeCashflow: payback.cumulativeCashflow,
    hrsScenario: HRS_DEMO_SCENARIO,
  };
}

/* ---------- helpers ---------- */

/** Map 4-bucket daily split → 24-hour fractions that sum to 1.
 *  night = 23–05 (7h), morning = 06–10 (5h), day = 11–16 (6h), evening = 17–22 (6h)
 */
export function dailyCurveFromSplit(split: UsageProfile["daily_split"]): number[] {
  const curve = new Array(24).fill(0);
  for (const h of [23, 0, 1, 2, 3, 4, 5]) curve[h] = split.night / 7;
  for (let h = 6; h <= 10; h++) curve[h] = split.morning / 5;
  for (let h = 11; h <= 16; h++) curve[h] = split.day / 6;
  for (let h = 17; h <= 22; h++) curve[h] = split.evening / 6;
  return curve;
}

function padTo(n: number, arr: number[] | null | undefined): number[] {
  const a = (arr ?? []).slice(0, n);
  while (a.length < n) a.push(0);
  return a;
}

/**
 * Apply Ontario TOU effective rates to a typical-day hourly series and scale
 * to annual. Uses a representative winter weekday (Feb 15) as the rate calendar.
 * Returns nominal CAD.
 */
function computeTouWeightedAnnual(hourlyKwhTypicalDay: number[]): number {
  const base = new Date(new Date().getFullYear(), 1, 15, 0, 0, 0);
  let dailyCAD = 0;
  for (let h = 0; h < 24; h++) {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    dailyCAD += hourlyKwhTypicalDay[h] * touEffectiveRate(d);
  }
  return dailyCAD * 365;
}
