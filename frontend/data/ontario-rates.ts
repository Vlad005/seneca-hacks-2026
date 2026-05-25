/**
 * Ontario residential electricity rates effective May 2026.
 *
 * Two layers:
 *   - HEADLINE rates ("energy" line on the bill) — what OEB publishes.
 *   - EFFECTIVE rates (energy + delivery + regulatory + HST) — what every
 *     kWh actually costs you. Use these for any savings math; using the
 *     headline number alone under-states savings by ~50%.
 *
 * Source: https://www.oeb.ca/consumer-information-and-protection/electricity-rates
 * Verify at scaffold time — rates shift every May and November.
 */

export type TimePeriod = "off_peak" | "mid_peak" | "on_peak";

/** Energy-only ¢/kWh as published by OEB. */
export const TOU_HEADLINE_CENTS: Record<TimePeriod, number> = {
  off_peak: 8.7,
  mid_peak: 12.2,
  on_peak: 18.2,
};

export const ULO_HEADLINE_CENTS = {
  ultra_low_overnight: 2.8, // 11pm–7am daily
  weekend_off_peak: 8.7,
  mid_peak: 12.2,
  on_peak: 28.6, // weekdays 4pm–9pm
};

/** Adders that apply to every kWh regardless of period. */
export const ADDERS_CENTS = {
  delivery_variable: 3.5,
  regulatory: 0.5,
  hst_pct: 0.13,
};

/** All-in effective ¢/kWh for savings math. */
export const TOU_EFFECTIVE_CENTS: Record<TimePeriod, number> = {
  off_peak: 15.0, // (8.7 + 3.5 + 0.5) × 1.13
  mid_peak: 18.9,
  on_peak: 25.7,
};

export const ULO_EFFECTIVE_CENTS = {
  ultra_low_overnight: 8.4, // (2.8 + 3.5 + 0.5) × 1.13
  weekend_off_peak: 15.0,
  mid_peak: 18.9,
  on_peak: 37.5,
};

const SUMMER_MONTHS = new Set([5, 6, 7, 8, 9, 10]); // May 1 – Oct 31

/**
 * Returns the TOU period for a given hour on a given date.
 *
 * Summer (May–Oct):
 *   on_peak  = weekdays 11am–5pm
 *   mid_peak = weekdays 7am–11am + 5pm–7pm
 *   off_peak = weekdays 7pm–7am + all weekend
 *
 * Winter (Nov–Apr):
 *   on_peak  = weekdays 7am–11am + 5pm–7pm
 *   mid_peak = weekdays 11am–5pm
 *   off_peak = weekdays 7pm–7am + all weekend
 */
export function touPeriodAt(date: Date): TimePeriod {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  const month = date.getMonth() + 1;

  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return "off_peak";
  if (hour < 7 || hour >= 19) return "off_peak";

  const isSummer = SUMMER_MONTHS.has(month);
  const isPeakWindow =
    (hour >= 7 && hour < 11) || (hour >= 17 && hour < 19); // morning + evening peak

  if (isSummer) {
    return isPeakWindow ? "mid_peak" : "on_peak";
  }
  return isPeakWindow ? "on_peak" : "mid_peak";
}

/** Effective rate ($/kWh, not cents) at the given moment. */
export function touEffectiveRate(date: Date): number {
  return TOU_EFFECTIVE_CENTS[touPeriodAt(date)] / 100;
}

/** Blended average effective TOU rate, weighted by a typical-week distribution. */
export function blendedTouRateCadPerKwh(): number {
  // Weekday hours: 24×5 = 120. Weekend hours: 24×2 = 48. Total: 168.
  // Off-peak: weekday 7pm–7am (12h × 5 = 60) + weekend all (48) = 108h
  // On-peak (winter assumed for blend): 7–11 + 5–7 = 6h × 5 = 30h
  // Mid-peak: 11–5 = 6h × 5 = 30h
  const total = 168;
  const off = 108 / total;
  const on = 30 / total;
  const mid = 30 / total;
  return (
    (TOU_EFFECTIVE_CENTS.off_peak * off +
      TOU_EFFECTIVE_CENTS.on_peak * on +
      TOU_EFFECTIVE_CENTS.mid_peak * mid) /
    100
  );
}
