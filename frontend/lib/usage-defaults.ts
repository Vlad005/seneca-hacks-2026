import type { ExtractedBill, UsageProfile } from "./types";

export const CALENDAR_MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Initial 12-month usage indexed by calendar month (0=Jan, 11=Dec). */
export function initialMonthly(bill: ExtractedBill | null): number[] {
  const hist = bill?.monthly_history_kwh;
  if (hist && hist.length === 12) {
    return hist.map((v) => Math.max(0, Math.round(v)));
  }
  // Fallback: flat at current-period kWh, or 800 if even that's missing.
  const seed = bill?.total_kwh_this_period ?? 800;
  return Array(12).fill(Math.round(seed));
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
