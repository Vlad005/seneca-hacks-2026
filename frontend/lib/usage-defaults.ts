import type { ExtractedBill, UsageProfile } from "./types";

export const CALENDAR_MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Ontario residential seasonal multipliers — heating-dominant winter + AC
 *  cooling-driven summer bump. Indexed Jan..Dec, sums to 12.00 so the mean
 *  multiplier is 1.0 (i.e. seed × shape preserves the seed as the annual avg).
 */
const ONTARIO_SEASONAL_SHAPE = [
  1.25, 1.20, 1.00, 0.85, 0.80, 0.85,
  1.10, 1.10, 0.85, 0.85, 1.00, 1.15,
] as const;

/** Initial 12-month usage indexed by calendar month (0=Jan, 11=Dec). */
export function initialMonthly(bill: ExtractedBill | null): number[] {
  const hist = bill?.monthly_history_kwh;
  if (hist && hist.length === 12 && hasMonthlyVariation(hist)) {
    return hist.map((v) => Math.max(0, Math.round(v)));
  }
  // Fallback: scale the Ontario residential seasonal shape to the seed so
  // months vary realistically instead of all reading identical.
  const seed = bill?.total_kwh_this_period ?? 800;
  return ONTARIO_SEASONAL_SHAPE.map((mult) => Math.max(0, Math.round(seed * mult)));
}

/** True if the extracted history has at least 2% range relative to its mean —
 *  guards against the GPT-4o-mini failure mode where the model fills the array
 *  with 12 identical values when it can't actually read the chart.
 */
function hasMonthlyVariation(values: number[]): boolean {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg <= 0) return false;
  const range = Math.max(...values) - Math.min(...values);
  return range / avg >= 0.02;
}

/** Initial daily split. Derived from on/mid/off-peak kWh if present, else defaults.
 *  Winter TOU mapping:
 *    night   = 50% of off-peak (overnight)
 *    morning = 65% of on-peak (7am–11am, 4 of 6 on-peak hours)
 *    day     = 100% of mid-peak (11am–5pm)
 *    evening = 35% of on-peak (5pm–7pm) + 50% of off-peak (7pm–11pm)
 */
export function initialDailySplit(bill: ExtractedBill | null): UsageProfile["daily_split"] {
  const on = bill?.on_peak_kwh ?? null;
  const mid = bill?.mid_peak_kwh ?? null;
  const off = bill?.off_peak_kwh ?? null;
  const total = (on ?? 0) + (mid ?? 0) + (off ?? 0);
  if (on !== null && mid !== null && off !== null && total > 0) {
    const night = (off * 0.5) / total;
    const morning = (on * 0.65) / total;
    const day = mid / total;
    const evening = (on * 0.35 + off * 0.5) / total;
    return normalize({ night, morning, day, evening });
  }
  // Typical Ontario residential mild evening peak.
  return { night: 0.25, morning: 0.25, day: 0.15, evening: 0.35 };
}

function normalize(s: UsageProfile["daily_split"]): UsageProfile["daily_split"] {
  const sum = s.night + s.morning + s.day + s.evening;
  if (sum <= 0) return { night: 0.25, morning: 0.25, day: 0.25, evening: 0.25 };
  return {
    night: s.night / sum,
    morning: s.morning / sum,
    day: s.day / sum,
    evening: s.evening / sum,
  };
}
